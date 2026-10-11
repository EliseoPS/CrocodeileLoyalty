export default function PrivacidadPage() {
  return (
    <main style={{ padding: 40, maxWidth: 740, margin: '0 auto', lineHeight: 1.6 }}>
      <h1>Aviso de Privacidad</h1>
      <p style={{ color: '#888' }}>Última actualización: 10/10/2026</p>

      <p>
        Crocodeile ('nosotros', 'la plataforma') opera un sistema de tarjetas de lealtad digitales
        que conecta a negocios ('los Negocios') con sus clientes finales. Este aviso explica cómo
        tratamos los datos personales de dos grupos distintos de personas: los dueños y
        administradores de los Negocios que contratan nuestro servicio, y los clientes finales que
        se registran para obtener una tarjeta de lealtad.
      </p>

      <h2>1. Identidad y domicilio del responsable</h2>
      <p>
        Crocodeile, con domicilio en León, Guanajuato, México, es
        responsable del tratamiento de los datos personales de los dueños de Negocios que usan esta
        plataforma, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los
        Particulares (LFPDPPP).
      </p>

      <h2>2. Aviso de privacidad para dueños de Negocio</h2>
      <p>Si contrataste nuestro servicio para tu negocio, recabamos:</p>
      <ul>
        <li>Correo electrónico (para tu cuenta y comunicaciones del servicio).</li>
        <li>Nombre y logotipo del negocio, y el color de marca que elijas (para personalizar las tarjetas de tus clientes).</li>
        <li>Información de facturación, procesada directamente por nuestro proveedor de pagos, Stripe — nosotros no almacenamos los datos completos de tu tarjeta.</li>
      </ul>
      <p><strong>Finalidad:</strong> crear y administrar tu cuenta, operar tu programa de lealtad, cobrar tu suscripción y brindarte soporte.</p>
      <p><strong>Transferencias:</strong> compartimos la información necesaria con Stripe (procesamiento de pagos) y con Google (Google Wallet, y en el futuro Apple Wallet) para emitir las tarjetas digitales de tus clientes.</p>

      <h2>3. Aviso de privacidad para clientes finales</h2>
      <p>
        Si te registraste escaneando un código QR para obtener una tarjeta de lealtad de un
        Negocio, ese Negocio es el <strong>responsable</strong> de tus datos personales — decide
        qué recompensas ofrecerte y cómo opera su programa de lealtad. Nosotros actuamos como
        <strong> encargados</strong>: procesamos y almacenamos tus datos únicamente para que el
        Negocio pueda operar tu tarjeta.
      </p>
      <p>Los datos que recabamos de ti son:</p>
      <ul>
        <li>Nombre.</li>
        <li>Número de teléfono.</li>
        <li>Correo electrónico, solo si el Negocio lo solicita.</li>
        <li>Tu historial de visitas y recompensas dentro de ese programa de lealtad específico.</li>
      </ul>
      <p>
        <strong>Finalidad primaria:</strong> crear y mantener tu tarjeta de lealtad digital,
        registrar tus visitas y permitirte canjear recompensas.
      </p>
      <p>
        <strong>Finalidades secundarias (opcionales):</strong> si el Negocio decide enviarte
        promociones u ofertas, te pedirá tu consentimiento expreso por separado. Negarte a esto no
        afecta tu tarjeta de lealtad.
      </p>
      <p>
        <strong>Transferencias:</strong> tu nombre, tu saldo de visitas y el estado de tus
        recompensas se transfieren a Google (y en el futuro Apple) únicamente para mostrar tu
        tarjeta en Google Wallet o Apple Wallet, si decides guardarla ahí.
      </p>

      <h2>4. Cómo usamos cookies y datos técnicos</h2>
      <p>
        Usamos una cookie de sesión para mantenerte conectado si eres dueño de un Negocio, y una
        cookie técnica para que los dispositivos de los cajeros permanezcan vinculados a su
        Negocio. No usamos cookies de publicidad ni de rastreo de terceros.
      </p>

      <h2>5. Derechos ARCO</h2>
      <p>
        Tienes derecho a Acceder, Rectificar, Cancelar u Oponerte (ARCO) al tratamiento de tus
        datos personales, así como a revocar tu consentimiento en cualquier momento.
      </p>
      <p>
        Si eres dueño de un Negocio, ejerce estos derechos escribiendo a contacto@crocodeile.com.
      </p>
      <p>
        Si eres cliente final de un Negocio, puedes ejercer estos derechos directamente con ese
        Negocio, o escribirnos a contacto@crocodeile.com y te pondremos en contacto con el Negocio
        correspondiente.
      </p>

      <h2>6. Cambios a este aviso</h2>
      <p>
        Podemos actualizar este aviso de privacidad. Publicaremos cualquier cambio en esta misma
        página con su fecha de actualización.
      </p>

      <h2>7. Contacto</h2>
      <p>Para cualquier duda sobre este aviso: contacto@crocodeile.com.</p>
    </main>
  )
}