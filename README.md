# CAA Helper

This is a simple single-page JavaScript application to help
people generate a CAA policy.  It's available online at
<https://sslmate.com/labs/caa>.

If you know of a CA that supports CAA which is not listed here, please
open an issue at <https://github.com/SSLMate/caa_helper/issues> or email
<sslmate@sslmate.com>.

## LIMITATIONS

* Does not support parameters to `issue` and `issuewild`.
* Does not support multiple `iodef` properties.
* Does not support properties besides `issue`, `issuewild`, and `iodef`.
* Always generates at least one issue property, so it's not possible
  to create a policy which says "allow all CAs to issue non-wildcard
  certs, but only some/no CAs to issue wildcard certs."

## LEGALESE

Copyright (©) 2016 Opsmate, Inc.

Licensed under the MPL v2.0.  See [LICENSE](LICENSE) for details.
