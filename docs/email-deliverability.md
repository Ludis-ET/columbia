# Gmail spam placement: findings and next steps

Checked on 13 November 2026 using the received message supplied by the user and
public DNS lookups. No DNS or hosting settings were changed, and no email was sent.

## What the received message confirms

| Check                      | Result                                                    |
| -------------------------- | --------------------------------------------------------- |
| Sending address            | noreply@columbiacareafh.com                               |
| SPF                        | PASS                                                      |
| DKIM                       | PASS, signed by columbiacareafh.com with selector default |
| DMARC                      | PASS                                                      |
| Sending IP seen by Gmail   | 37.26.105.28                                              |
| Transport to Gmail         | TLS 1.3                                                   |
| Server name shown to Gmail | ecosafe-abs.com                                           |

Authentication is already working for this message. Keep the existing passing
SPF, DKIM and DMARC configuration. Changing the DMARC policy alone does not
guarantee inbox delivery.

## A hosting issue to investigate

Both Google Public DNS and Cloudflare returned NXDOMAIN for the PTR lookup of
37.26.105.28. A PTR record maps a sending IP address back to its mail hostname.

The reported SMTP name, ecosafe-abs.com, also resolved to Cloudflare addresses
rather than 37.26.105.28 during this check. This needs review by the hosting
provider: the outgoing mail IP, its reverse DNS, the forward DNS for that
hostname and Exim's outgoing HELO/EHLO name should be consistent.

Google requires valid forward and reverse DNS for sending servers. This is a
specific deliverability problem to fix, but these headers do not prove it is
the only reason the message went to Spam. Shared-IP reputation and each
recipient's filtering history can still affect placement.

The provider or IP owner must configure reverse DNS. Adding a TXT record to
the website's DNS zone cannot repair the IP's PTR record.

## Message to copy to hosting support

> Email from noreply@columbiacareafh.com reaches Gmail but is placed in Spam.
> Gmail's received headers show SPF=PASS, DKIM=PASS and DMARC=PASS.
> The actual sending IP is 37.26.105.28, with ecosafe-abs.com reported as the
> sending server name. Public PTR queries through Google and Cloudflare return
> NXDOMAIN for that IP, and ecosafe-abs.com currently resolves elsewhere.
>
> Please repair or confirm reverse DNS/PTR for 37.26.105.28, ensure its chosen
> mail hostname forward-resolves to that IP, and check Exim's outgoing HELO/EHLO
> configuration. Please also review the sending IP's reputation and any shared
> hosting delivery issues affecting Gmail.
>
> Keep the domain's currently passing SPF, DKIM and DMARC configuration intact
> unless your investigation identifies a specific correction.

After the provider fixes it, check a new message rather than an old message's
headers. Confirm SPF, DKIM and DMARC still pass and verify the provider's
forward/reverse-DNS changes.

## What you can do in Gmail now

Open the legitimate Columbia Care message in Spam and choose Report not spam.
Add noreply@columbiacareafh.com to your contacts. This can help your own inbox;
it does not repair the sending server's DNS or guarantee delivery to everyone.

Use an email address you control when testing the tour form. The form sends a
confirmation to the submitted address.

## Application changes

All four email templates now use a consistent Columbia Care layout. Automatic
role labels, distribution lists and operator email addresses have been removed
from the message bodies. Routing still sends notifications to the configured
addresses, and normal From, To and Reply-To email headers remain functional.

The application sends both HTML and plain-text alternatives. That provides a
readable fallback; it is not a guarantee against spam filtering. The templates
do not add tracking images or external font requests.

Official references:
[Google sender requirements](https://support.google.com/mail/answer/81126?hl=en),
[cPanel spam and PTR guidance](https://docs.cpanel.net/knowledge-base/email/how-to-keep-your-email-out-of-the-spam-folder/).
