# cPanel email notifications

The confirmed sending mailbox is noreply@columbiacareafh.com. Its secure outgoing
server is mail.columbiacareafh.com on port 465. SMTP requires the full mailbox
address and that mailbox's password.

The local .env.local configuration passed a real SMTP connection and mailbox
authentication check. No email was sent. This does not establish which values
are currently set in the running cPanel application.

## Set the three required values

Open cPanel > Setup Node.js App > the columbia application > Environment
variables. Set these values, without surrounding quotation marks:

| Name      | Value                                      |
| --------- | ------------------------------------------ |
| SMTP_HOST | mail.columbiacareafh.com                   |
| SMTP_USER | noreply@columbiacareafh.com                |
| SMTP_PASS | The actual password for that email account |

The application defaults to port 465, immediate TLS and the authenticated mailbox
as the sender. If you already have these optional settings, ensure they agree:

| Name        | Correct value                               |
| ----------- | ------------------------------------------- |
| SMTP_PORT   | 465                                         |
| SMTP_SECURE | true                                        |
| SMTP_FROM   | Columbia Care <noreply@columbiacareafh.com> |

SMTP_PASS must not contain the literal text "Use the email account's password".
That text on the Connect Devices page tells you which password to enter. Use
the same mailbox password as the working local .env.local configuration, or
reset the mailbox password in cPanel > Email Accounts > Manage and update the
application setting to match. The cPanel login password and FTP password are
different credentials.

Save the application settings, then click Restart. Private SMTP settings do not
require a GitHub secret or a new build. cPanel environment values take precedence
over private .env files, so a stale cPanel value must be corrected there.
.env.example is a reference only and is not loaded by the app.

## Owner and stakeholder recipients

The three established stakeholders are always included:

- Wondimubelete4@gmail.com
- Zgenet19@gmail.com
- leulsegedmelaku1020@gmail.com

No additional recipient setting is required to notify those three addresses.
To include another owner or stakeholder, add comma-separated addresses to
OWNER_NOTIFICATION_EMAIL and/or STAKEHOLDER_EMAILS in the same Node.js app.
The application combines both lists with the three established addresses and
removes duplicates. The first configured owner is the reply-to contact for the
family confirmation.

Tour inquiries notify this combined list. Admin replies BCC this list, and
inquiry status changes notify it as well. If the family provides an email
address, the application also sends its confirmation.

## Check the running application

Deploy the email code changes first, then sign in as the owner and open
Admin > Settings > Email notifications.

The panel shows the active sender, recipient list, missing SMTP setting names
and invalid port/TLS combinations. It never displays passwords or API keys.

Click Check SMTP connection. The check runs inside the deployed application's
process and uses its cPanel environment. It tests DNS, TLS and mailbox
authentication without sending an email. Editors and unauthenticated callers
cannot run it.

A successful connection check does not prove inbox delivery or that the mail
server accepts every sender/recipient combination. To check the full flow,
submit one clearly labelled test inquiry with your own email address. This
sends notifications to all configured stakeholders and a confirmation to your
address. Avoid repeating an identical name within five minutes: the duplicate
submission guard intentionally does not send another notification.

Check cPanel > Email > Track Delivery and the destination inboxes, including
spam. SMTP acceptance means the mail server accepted the message, not that
Gmail placed it in the inbox. Review Email Deliverability in cPanel if delivery
reports show domain-authentication problems.

## Error meanings

| Message                              | Action                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| Missing SMTP settings                | Add the listed names in the correct Node.js application, save and restart            |
| SMTP login failed                    | Check the full noreply address and actual mailbox password                           |
| Outgoing server could not be found   | Use mail.columbiacareafh.com without smtp://, a port suffix or spaces                |
| Outgoing server could not be reached | Confirm port 465 and ask the host about outbound SMTP restrictions                   |
| Secure mail connection failed        | Use cPanel's Secure SSL/TLS hostname and port; do not disable certificate validation |
| Sender or recipient rejected         | Check SMTP_FROM, the recipient addresses and cPanel Track Delivery                   |

The server logs [email] cPanel SMTP dispatch failed for failed attempts and
[email] SMTP accepted message with a message ID and recipient count after SMTP
acceptance. It does not log the password, message body or inquiry details.
Inquiries remain saved even when their notification email fails.

Official references:
[cPanel mail settings](https://docs.cpanel.net/cpanel/email/set-up-mail-client/),
[Track Delivery](https://docs.cpanel.net/cpanel/email/track-delivery/),
[Nodemailer SMTP verification](https://nodemailer.com/smtp).
