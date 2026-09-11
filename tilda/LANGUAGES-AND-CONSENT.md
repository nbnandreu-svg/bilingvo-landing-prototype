# Languages, consent and lead forms

The header switches the complete interface between Russian, English, French,
Spanish, Chinese and Arabic. The chosen language is retained in the `lang` URL
parameter. Demo speech and its original Russian captions remain independent.
Translation sources are in `scripts/locale-*.tsv` and `locale-source.json`.
Run `python scripts/build_locales.py` before generating a new release.

The first-visit cookie dialog offers accept, reject and granular settings.
Analytics is off by default. A versioned choice expires after 180 days and can
be changed using the footer button. Marketing trackers are not installed.
No Yandex Metrica counter is currently configured (`metricaId=0`). Do not add a
counter in Tilda's automatic Analytics settings: that bypasses this consent gate.

`HEAD-consent.html` is installed in the project HEAD, with an exact `/bilingvo`
path guard. Its CSP allows functional scripts and form endpoints and excludes
Tilda's automatic statistics script. It leaves the other project page alone.
If adding an analytics counter later, update both this policy and the consent
loader, and verify no analytics request is made before acceptance or after
rejection. Keep the standard Tilda statistics setting in simplified mode.

Native form block `rec3791816301` is a hidden transport for the five custom lead
forms. `tilda-forms.js` uses the official form SDK, preserving its receiver and
anti-spam flow. Only a server `tildaform:aftersuccess` event can open the success
dialog. Errors retain user input. There are no automatic submission retries.
The custom forms remain unavailable until the native block has an active email
receiver. The requested recipient is `sales@agropromcifra.ru`.

Email service integration `9009129758` was created, but at delivery it still
required the confirmation link sent by Tilda. After confirmation, select this
email service in the native block Content settings, save and publish the page.
Do not report email delivery as verified until an authorized end-to-end test has
been received in that inbox. The existing Tilda CRM connection was inherited
from the project, not added for this release.

Verification: all six page locales and Arabic RTL checked in the browser;
390px French and Arabic layouts inspected; cookie decision and expiry tests;
form success and error UI checked with a local receiver; the real Tilda SDK was
tested against a local HTTP response fixture without sending any email. Existing
configuration and release integrity tests remain in place. This extends the
previous security fixes but is not a new comprehensive security audit.

Release with `python scripts/build_release.py NEW_TAG`, publish immutable assets,
then replace the T123 fragment with `tilda/T123-compact.html` and publish Tilda.
