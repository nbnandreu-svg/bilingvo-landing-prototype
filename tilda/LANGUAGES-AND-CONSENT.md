# Languages, consent and lead forms

The header switches the complete interface between Russian, English, French,
Spanish, Chinese and Arabic. The chosen language is retained in the `lang` URL
parameter. Demo speech and its original Russian captions remain independent.
Translation sources are in `scripts/locale-*.tsv` and `locale-source.json`.
Run `python scripts/build_locales.py` before generating a new release.

The first-visit cookie notice has one OK button. It is an informational notice,
not an analytics consent form. OK stores only an acknowledgement for 180 days.
The footer can reopen it. Earlier optional-cookie choices are discarded.
Analytics and marketing remain disabled. There is no analytics loader in
`consent.js`. The notice uses the exact customer-supplied wording about continued
browsing and a visually styled placeholder link. This is a presentation mockup:
the link deliberately does not navigate, and the owner's policy is still pending.
The desktop panel is 1320px wide and at least 315px high, adapting to smaller screens.

`HEAD-consent.html` is installed in the project HEAD, with an exact `/bilingvo`
path guard. Its CSP allows functional scripts and form endpoints and excludes
Tilda's automatic statistics script. It leaves the other project page alone.
If adding analytics later, implement a separate explicit consent mechanism,
update this policy and verify that tracking cannot start without permission.
Do not connect counters through Tilda's automatic Analytics settings.
Keep the standard Tilda statistics setting in simplified mode.

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
390px French and Arabic layouts inspected; acknowledgement and expiry tests;
form success and error UI checked with a local receiver; the real Tilda SDK was
tested against a local HTTP response fixture without sending any email. Existing
configuration and release integrity tests remain in place. This extends the
previous security fixes but is not a new comprehensive security audit.

Release with `python scripts/build_release.py NEW_TAG`, publish immutable assets,
then replace the T123 fragment with `tilda/T123-compact.html` and publish Tilda.
