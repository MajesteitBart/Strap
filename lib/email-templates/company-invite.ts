import { escapeHtml } from "@/lib/rich-text";


export type CompanyInviteEmailInput = {
  companyName: string;
  inviterName: string;
  acceptUrl: string;
  siteUrl: string;
};

export function companyInviteSubject(companyName: string): string {
  return `Join ${companyName} on Strap`;
}

export function renderCompanyInviteEmail(input: CompanyInviteEmailInput): string {
  const company = escapeHtml(input.companyName);
  const inviter = escapeHtml(input.inviterName);
  const acceptUrl = escapeHtml(input.acceptUrl);
  const siteUrl = escapeHtml(input.siteUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light" />
    <title>${company} on Strap</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Bricolage+Grotesque:wght@600&display=swap" />
  </head>
  <body style="margin:0; padding:0; background-color:#fbf6ee; -webkit-font-smoothing:antialiased; -webkit-text-size-adjust:100%;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all; color:#fbf6ee; font-size:1px; line-height:1px;">
      ${inviter} invited you to the ${company} Strap.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fbf6ee;">
      <tr>
        <td align="center" style="padding:48px 24px;">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="width:480px; max-width:480px;">
            <tr>
              <td style="padding-bottom:28px;">
                <img src="${siteUrl}/assets/brand/brandmark-email.png" alt="Strap" width="156" height="36" style="width:156px; height:36px; display:block; border:0;" />
              </td>
            </tr>
            <tr>
              <td style="border:1px solid #211e19; background-color:#ffffff;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="border-bottom:1px solid #211e19; padding:10px 24px; font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace; font-size:11px; letter-spacing:0.04em; text-transform:uppercase; color:#211e19;">
                      Strap &middot; company &middot; invite
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:28px 24px 24px;">
                      <div style="font-family:'Bricolage Grotesque','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:26px; font-weight:600; letter-spacing:-0.03em; line-height:1.1; color:#211e19; padding-bottom:12px;">
                        Join ${company} on Strap
                      </div>
                      <div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#363430; padding-bottom:24px;">
                        ${inviter} invited you to the ${company} Strap, the shared context file their AI agents read before they work.
                      </div>
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="border:1px solid #211e19; background-color:#2547d0;">
                            <a href="${acceptUrl}" target="_blank" style="display:inline-block; padding:14px 26px; font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace; font-size:13px; font-weight:500; color:#ffffff; text-decoration:none;">
                              Accept invite
                            </a>
                          </td>
                        </tr>
                      </table>
                      <div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:13px; line-height:1.65; color:#7a756b; padding-top:24px;">
                        If you were not expecting this, you can safely ignore this email.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-top:20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace; font-size:11px; color:#7a756b;">
                      &copy; 2026 Strap
                    </td>
                    <td align="right" style="font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace; font-size:11px; color:#7a756b;">
                      <a href="${siteUrl}/privacy" target="_blank" style="color:#7a756b; text-decoration:underline;">Privacy</a>
                      &nbsp;&nbsp;
                      <a href="${siteUrl}/terms" target="_blank" style="color:#7a756b; text-decoration:underline;">Terms</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
