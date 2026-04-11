<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Verification code</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f5;">
        <tr>
            <td align="center" style="padding:40px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <tr>
                        <td style="background:linear-gradient(135deg,#c2410c 0%,#ea580c 50%,#f97316 100%);background-color:#ea580c;padding:28px 32px;text-align:center;">
                            <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.9);">
                                {{ config('app.name') }}
                            </p>
                            <h1 style="margin:10px 0 0;font-size:22px;font-weight:700;line-height:1.3;color:#ffffff;">
                                Password reset code
                            </h1>
                            <p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:rgba(255,255,255,0.92);">
                                Use the code below to verify it’s you and continue signing in.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:36px 32px 28px;">
                            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3f3f46;">
                                Hi there,
                            </p>
                            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">
                                We received a request to help you access your account. Enter this one-time code in the app:
                            </p>
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding:20px 16px;background-color:#fff7ed;border:1px dashed #fdba74;border-radius:10px;">
                                        <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#9a3412;">
                                            Your code
                                        </p>
                                        <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:0.35em;font-family:ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace;color:#c2410c;line-height:1.2;">
                                            {{ $code }}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#71717a;">
                                This code expires in <strong style="color:#3f3f46;">{{ $expiresMinutes }} minutes</strong>. For your security, don’t share it with anyone.
                            </p>
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:28px;">
                                <tr>
                                    <td style="padding-top:24px;border-top:1px solid #e4e4e7;">
                                        <p style="margin:0;font-size:13px;line-height:1.6;color:#a1a1aa;">
                                            If you didn’t request this email, you can safely ignore it — your password won’t be changed.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px 28px;background-color:#fafafa;border-top:1px solid #e4e4e7;">
                            <p style="margin:0;font-size:12px;line-height:1.5;color:#a1a1aa;text-align:center;">
                                Sent by <strong style="color:#71717a;">{{ config('app.name') }}</strong><br>
                                This is an automated message; please don’t reply to this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
