// Copyright (C) 2017 Opsmate, Inc.
//
// This Source Code Form is subject to the terms of the Mozilla
// Public License, v. 2.0. If a copy of the MPL was not distributed
// with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// This software is distributed WITHOUT A WARRANTY OF ANY KIND.
// See the Mozilla Public License for details.

package main

import (
	"bytes"
	"encoding/csv"
	"encoding/xml"
	"fmt"
	"os"
	"strings"
	"regexp"
)

var canames = map[string][]string{
	"Asseco Data Systems S.A. (previously Unizeto Certum)": {"Asseco", "Unizeto", "Certum"},
	"Autoridad de Certificacion Firmaprofesional": { "Firmaprofesional" },
	"Certinomis / Docapost": { "Certinomis", "Docapost" },
	"China Financial Certification Authority (CFCA)": { "CFCA", "China Financial" },
	"Sectigo": { "Sectigo", "Comodo CA" },
	"Consorci Administració Oberta de Catalunya (Consorci AOC, CATCert)": { "CATCert", "Consorci AOC" },
	"Cybertrust Japan / JCSI": { "Cybertrust Japan" },
	"Deutscher Sparkassen Verlag GmbH (S-TRUST, DSV-Gruppe)": { "S-TRUST" },
	"Dhimyotis / Certigna": { "Certigna" },
	"DigiCert": {"DigiCert","Symantec","GeoTrust","Thawte","RapidSSL"},
	"DocuSign (OpenTrust/Keynectis)": { "DocuSign", "Keynectis", "OpenTrust", "Certplus" },
	"Global Digital Cybersecurity Authority Co., Ltd. (Formerly Guang Dong Certificate Authority (GDCA))": { "GDCA" },
	"GoDaddy": { "GoDaddy", "Starfield Technologies" },
	"Government of Hong Kong (SAR), Hongkong Post, Certizen": { "Certizen", "Hongkong Post" },
	"Government of Spain, Autoritat de Certificació de la Comunitat Valenciana (ACCV)": { "ACCV", "Government of Spain" },
	"Government of Spain, Fábrica Nacional de Moneda y Timbre (FNMT)": { "FNMT", "Government of Spain" },
	"Government of Taiwan, Government Root Certification Authority (GRCA)": { "GRCA", "Government of Taiwan" },
	"Government of The Netherlands, PKIoverheid (Logius)": { "PKIoverheid" },
	"Government of Turkey, Kamu Sertifikasyon Merkezi (Kamu SM)": { "Kamu SM" },
	"Internet Security Research Group (ISRG)": { "Let's Encrypt" },
	"SECOM Trust Systems CO., LTD.": { "SECOM" },
	"T-Systems International GmbH (Deutsche Telekom)": nil, // defined in extra_cas.xml so we can separate out DFN-PKI
}

var parenregex = regexp.MustCompile(`\s+\([^)]*\)`)
var fluffregex = regexp.MustCompile(`(\s+CA)?(,?\s+(S\.A\.|SA|Inc\.?|Ltd\.?|Limited|AG|Company|a\.s\.|Corporation|LLC))?$`)

func escapexml(str string) string {
	buf := bytes.NewBuffer(nil)
	err := xml.EscapeText(buf, []byte(str))
	if err != nil {
		panic(err)
	}
	return buf.String()
}

func main() {
	records, err := csv.NewReader(os.Stdin).ReadAll()
	if err != nil {
		fmt.Fprintf(os.Stderr, "mkcasxml: %s\n", err)
		os.Exit(1)
	}

	usedca := map[string]bool{}
	fmt.Printf("<cas xmlns=\"http://xmlns.sslmate.com/caa\">\n")
	for _, row := range records {
		name := row[0]
		akas := []string{}
		if names, ok := canames[name]; ok {
			usedca[name] = true
			if len(names) == 0 {
				continue
			}
			name = names[0]
			akas = names[1:]
		} else {
			name = parenregex.ReplaceAllLiteralString(name, "")
			name = fluffregex.ReplaceAllLiteralString(name, "")
		}

		if row[5] == "N/A" || row[5] == "" {
			continue
		}
		fmt.Printf("\t<ca>\n")
		fmt.Printf("\t\t<name>%s</name>\n", escapexml(name))
		for _, aka := range akas {
			fmt.Printf("\t\t<aka>%s</aka>\n", escapexml(aka))
		}

		caas := strings.Split(row[5], ",")
		for _, caa := range caas {
			fmt.Printf("\t\t<caa>%s</caa>\n", escapexml(strings.ToLower(strings.TrimSpace(caa))))
		}
		fmt.Printf("\t</ca>\n")
	}
	fmt.Printf("</cas>\n")

	for caname, _ := range canames {
		if !usedca[caname] {
			fmt.Fprintf(os.Stderr, "Warning: did not see CA `%s'\n", caname)
		}
	}
}
