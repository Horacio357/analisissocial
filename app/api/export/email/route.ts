import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, subject, message, pdfBase64, filename } = body;

    if (!to || !pdfBase64) {
      return NextResponse.json({ error: 'Email y reporte requeridos' }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_dummy") {
      return NextResponse.json({ error: 'Configuración de servidor incompleta (Agregá tu API KEY en Vercel)' }, { status: 500 });
    }

    let base64Content = pdfBase64;
    if (pdfBase64.includes('base64,')) {
      base64Content = pdfBase64.split('base64,')[1];
    }

    const emailResponse = await resend.emails.send({
      from: 'Proyecto Talos PRO <onboarding@resend.dev>', // Usamos el sandbox dev de Resend por defecto
      to: [to],
      subject: subject || 'Reporte de Inteligencia Proyecto Talos',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #00d4ff;">Proyecto Talos - Reporte Generado</h2>
          <p>Adjunto encontrarás el reporte de análisis territorial y de percepción pública.</p>
          ${message ? `<blockquote style="border-left: 4px solid #00d4ff; padding-left: 10px; margin: 20px 0; font-style: italic;">"${message}"</blockquote>` : ''}
          <p>Este informe fue generado automáticamente mediante inteligencia artificial procesando titulares en tiempo real.</p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">© ${new Date().getFullYear()} Proyecto Talos - Todos los derechos reservados.</p>
        </div>
      `,
      attachments: [
        {
          filename: filename || 'reporte-proyecto-talos.pdf',
          content: base64Content,
        },
      ],
    });

    if (emailResponse.error) {
      console.error("Resend API Error:", emailResponse.error);
      return NextResponse.json({ error: emailResponse.error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: emailResponse.data });
  } catch (error: any) {
    console.error("Internal API Error:", error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
