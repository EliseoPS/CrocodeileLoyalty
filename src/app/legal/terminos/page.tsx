export default function TerminosPage() {
  return (
    <main style={{ padding: 40, maxWidth: 740, margin: '0 auto', lineHeight: 1.6 }}>
      <h1>Términos y Condiciones del Servicio</h1>
      <p style={{ color: '#888' }}>Última actualización: 10/10/2026</p>

      <p>
        Estos términos aplican a los Negocios que contratan nuestra plataforma de tarjetas de
        lealtad digitales. Al crear una cuenta, aceptas estos términos en su totalidad.
      </p>

      <h2>1. Descripción del servicio</h2>
      <p>
        Ofrecemos una plataforma para que los Negocios creen y administren programas de lealtad
        digitales: registro de clientes por código QR, emisión de tarjetas en Google Wallet (y en
        el futuro Apple Wallet), un escáner para otorgar sellos y canjear recompensas, y un panel
        con estadísticas básicas. No garantizamos resultados de ventas, retención de clientes, ni
        la disponibilidad ininterrumpida del servicio.
      </p>

      <h2>2. Cuenta y periodo de prueba</h2>
      <p>
        Al registrarte obtienes un periodo de prueba gratuito de 30 días. Terminado este periodo,
        debes contratar un plan de pago para seguir usando el servicio.
      </p>

      <h2>3. Suscripción y pagos</h2>
      <p>
        La suscripción se cobra de forma recurrente mensual a través de Stripe. Si un pago falla,
        tu cuenta entra en un periodo de gracia de 5 días, durante el cual seguirás teniendo acceso
        mientras intentamos procesar el cobro de nuevo. Si el pago no se regulariza en ese plazo, tu
        cuenta se suspende automáticamente: dejarás de poder otorgar sellos nuevos o registrar
        clientes, pero tus datos y los de tus clientes se conservan y tu cuenta se reactiva de
        inmediato al pagar. No ofrecemos reembolsos por periodos ya facturados, salvo que la ley
        aplicable indique lo contrario.
      </p>
      <p>
        Puedes cancelar tu suscripción en cualquier momento desde tu panel. La cancelación aplica al
        final del periodo ya pagado.
      </p>

      <h2>4. Logotipos y contenido que subes</h2>
      <p>
        Al subir un logotipo, imagen o cualquier contenido a la plataforma, declaras y garantizas
        que tienes los derechos necesarios para usarlo (ya sea porque es tu propia marca o cuentas
        con autorización de su titular). Eres el único responsable de cualquier infracción de
        derechos de autor o de marca derivada del contenido que subas. Nos reservamos el derecho de
        eliminar cualquier contenido que nos sea notificado como infractor de derechos de terceros.
      </p>

      <h2>5. Datos de tus clientes</h2>
      <p>
        Los datos que recabas de tus clientes finales (nombre, teléfono, historial de visitas) te
        pertenecen a ti como Negocio; nosotros actuamos únicamente como encargados técnicos de ese
        tratamiento, conforme se detalla en nuestro{' '}
        <a href="/legal/privacidad">Aviso de Privacidad</a>. Eres responsable de contar con el
        consentimiento adecuado de tus clientes y de cumplir con la normativa de protección de
        datos aplicable a tu propio negocio.
      </p>
      <p>
        Si cancelas tu cuenta, podrás solicitar la exportación de los datos de tus clientes dentro
        de los 30 días posteriores a la cancelación. Después de ese plazo, podemos eliminar
        permanentemente esa información.
      </p>

      <h2>6. Limitación de responsabilidad</h2>
      <p>
        El servicio se ofrece "tal cual". No somos responsables por pérdidas de negocio, lucro
        cesante, interrupciones del servicio, ni por fallas de terceros de los que dependemos
        (proveedores de pago, hosting, Google Wallet, Apple Wallet). Nuestra responsabilidad total
        frente a ti, en cualquier caso, se limita al monto que hayas pagado por el servicio en los
        3 meses previos al reclamo.
      </p>

      <h2>7. Suspensión y terminación</h2>
      <p>
        Podemos suspender o cancelar tu cuenta si incumples estos términos, usas la plataforma para
        fines ilícitos, o no regularizas un pago vencido conforme a la sección 3.
      </p>

      <h2>8. Modificaciones</h2>
      <p>
        Podemos actualizar estos términos. Te notificaremos los cambios relevantes por correo o
        dentro de tu panel, y el uso continuado del servicio después de esa notificación implica tu
        aceptación de los nuevos términos.
      </p>

      <h2>9. Contacto</h2>
      <p>Para cualquier duda sobre estos términos: contacto@crocodeile.com.</p>
    </main>
  )
}