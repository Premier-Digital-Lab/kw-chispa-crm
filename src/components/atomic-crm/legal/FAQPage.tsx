import { useNavigate } from "react-router";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { useGetIdentity } from "ra-core";
import { Navigate } from "react-router";

const FAQ_SECTIONS = [
  {
    emoji: "🌐",
    title: "General",
    questions: [
      {
        q: "How do I log in to KW CHISPA Central?",
        a: "Go to kw-chispa-central.netlify.app and enter your email and password. If you forgot your password, click \"Forgot Password\" on the login page and a reset link will be sent to your email.",
        qes: "¿Cómo inicio sesión en KW CHISPA Central?",
        aes: "Ve a kw-chispa-central.netlify.app e ingresa tu correo electrónico y contraseña. Si olvidaste tu contraseña, haz clic en \"Olvidé mi contraseña\" en la página de inicio de sesión y recibirás un enlace para restablecerla.",
      },
      {
        q: "How do I create an account?",
        a: "Click \"Don't have an account? Sign Up\" on the login page and complete the registration form. After submitting, you will receive a confirmation email — click the link to verify your email. Your account will then be reviewed by an administrator before you gain access.",
        qes: "¿Cómo creo una cuenta?",
        aes: "Haz clic en \"¿No tienes cuenta? Regístrate\" en la página de inicio de sesión y completa el formulario de registro. Después de enviarlo, recibirás un correo de confirmación — haz clic en el enlace para verificar tu correo. Luego, un administrador revisará tu cuenta antes de que puedas acceder.",
      },
      {
        q: "I signed up but can't log in. What do I do?",
        a: "There are two possible reasons: (1) You haven't confirmed your email yet — check your inbox and spam folder for a confirmation email. (2) Your account is pending approval by an administrator. You will receive an email once your account is approved.",
        qes: "Me registré pero no puedo iniciar sesión. ¿Qué hago?",
        aes: "Hay dos posibles razones: (1) Aún no has confirmado tu correo electrónico — revisa tu bandeja de entrada y carpeta de spam. (2) Tu cuenta está pendiente de aprobación por un administrador. Recibirás un correo electrónico una vez que tu cuenta sea aprobada.",
      },
      {
        q: "How do I change my password?",
        a: "Click on your profile icon in the top right corner, select \"Profile\", then click \"Change Password.\" A password reset email will be sent to your email address.",
        qes: "¿Cómo cambio mi contraseña?",
        aes: "Haz clic en tu ícono de perfil en la esquina superior derecha, selecciona \"Perfil\" y luego haz clic en \"Cambiar contraseña\". Se enviará un correo de restablecimiento de contraseña a tu dirección de correo.",
      },
      {
        q: "How do I change the language of the platform?",
        a: "The platform automatically detects your browser language. You can also change it manually by going to your Profile page and selecting your preferred language from the Language dropdown.",
        qes: "¿Cómo cambio el idioma de la plataforma?",
        aes: "La plataforma detecta automáticamente el idioma de tu navegador. También puedes cambiarlo manualmente en tu página de Perfil seleccionando tu idioma preferido en el menú desplegable de Idioma.",
      },
    ],
  },
  {
    emoji: "🏠",
    title: "Dashboard / Panel",
    questions: [
      {
        q: "What do I see on the Dashboard?",
        a: "The Dashboard is your home page. It shows quick links to all sections of the platform, upcoming KW CHISPA events, and a link to become a Chapter Leader. Admins also see pending member approvals, newsletter tools, and tasks.",
        qes: "¿Qué veo en el Panel?",
        aes: "El Panel es tu página de inicio. Muestra accesos rápidos a todas las secciones de la plataforma, próximos eventos de KW CHISPA y un enlace para convertirte en Líder de Capítulo. Los administradores también ven aprobaciones de miembros pendientes, herramientas de boletín y tareas.",
      },
      {
        q: "What is the \"Interested in Becoming a Chapter Leader?\" button?",
        a: "Clicking that button opens a Google Form where you can express your interest in becoming a KW CHISPA Chapter Leader. A member of the leadership team will follow up with you.",
        qes: "¿Qué es el botón \"¿Interesado/a en ser Líder de Capítulo?\"",
        aes: "Al hacer clic en ese botón, se abre un formulario de Google donde puedes expresar tu interés en convertirte en Líder de Capítulo de KW CHISPA. Un miembro del equipo de liderazgo se pondrá en contacto contigo.",
      },
    ],
  },
  {
    emoji: "🔍",
    title: "Find an Agent / Buscar Agente",
    questions: [
      {
        q: "How do I search for other KW CHISPA members?",
        a: "Click \"Find an Agent\" in the top navigation. You can search by name, city, state, country, language, Market Center, county, or agent role. Fill in at least one field and click Search.",
        qes: "¿Cómo busco a otros miembros de KW CHISPA?",
        aes: "Haz clic en \"Buscar Agente\" en la navegación superior. Puedes buscar por nombre, ciudad, estado, país, idioma, Market Center, condado o rol del agente. Completa al menos un campo y haz clic en Buscar.",
      },
      {
        q: "Can I search using the AI chatbot?",
        a: "Yes! Click the red chat bubble in the bottom-right corner of any page and type your search in plain English or Spanish. For example: \"Find members in Texas who speak Spanish\" or \"Busca miembros en Miami que hablen inglés.\"",
        qes: "¿Puedo buscar usando el asistente de chat IA?",
        aes: "¡Sí! Haz clic en el botón de chat rojo en la esquina inferior derecha de cualquier página y escribe tu búsqueda en inglés o español. Por ejemplo: \"Find members in Texas who speak Spanish\" o \"Busca miembros en Miami que hablen inglés.\"",
      },
      {
        q: "How do I view members on a map?",
        a: "After searching, click the \"Map\" button next to the search results to switch to the interactive map view. Click \"Cards\" to go back to the list view.",
        qes: "¿Cómo veo a los miembros en un mapa?",
        aes: "Después de buscar, haz clic en el botón \"Mapa\" junto a los resultados de búsqueda para cambiar a la vista de mapa interactivo. Haz clic en \"Tarjetas\" para volver a la vista de lista.",
      },
    ],
  },
  {
    emoji: "👤",
    title: "My Profile / Mi Perfil",
    questions: [
      {
        q: "How do I complete or update my profile?",
        a: "If your profile is incomplete, you will see a red banner on your Dashboard. Click \"Complete Profile\" to go to your profile form. You can also access it by clicking your profile icon in the top right corner and selecting your name.",
        qes: "¿Cómo completo o actualizo mi perfil?",
        aes: "Si tu perfil está incompleto, verás un banner rojo en tu Panel. Haz clic en \"Completar perfil\" para ir a tu formulario de perfil. También puedes acceder haciendo clic en tu ícono de perfil en la esquina superior derecha y seleccionando tu nombre.",
      },
      {
        q: "What information should I fill in on my profile?",
        a: "Your profile has 5 tabs: Profile (basic info), Social Media (your social links), KW Info (your Market Center details), Service Areas (cities, states and countries you serve), and Membership (your membership tier and status). The more complete your profile, the easier it is for other members to find you.",
        qes: "¿Qué información debo completar en mi perfil?",
        aes: "Tu perfil tiene 5 pestañas: Perfil (información básica), Redes Sociales (tus enlaces sociales), Información KW (detalles de tu Market Center), Áreas de Servicio (ciudades, estados y países que atiendes) y Membresía (tu nivel y estado de membresía). Cuanto más completo esté tu perfil, más fácil será que otros miembros te encuentren.",
      },
      {
        q: "Why is my profile showing as incomplete even after I saved it?",
        a: "Make sure all required fields (marked with *) are filled in across all tabs. Required fields include Market Center Name, Agent Role, Market Center Address, Languages Spoken, Cities Served, States Served, and Countries Served.",
        qes: "¿Por qué mi perfil aparece como incompleto aunque lo guardé?",
        aes: "Asegúrate de que todos los campos obligatorios (marcados con *) estén completados en todas las pestañas. Los campos obligatorios incluyen Nombre del Market Center, Rol del Agente, Dirección del Market Center, Idiomas que habla, Ciudades que atiende, Estados que atiende y Países que atiende.",
      },
    ],
  },
  {
    emoji: "⭐",
    title: "Premier",
    questions: [
      {
        q: "What is Premier membership?",
        a: "Premier membership gives you access to the Premier Resources section and the Social Media Content Generator. These tools include exclusive documents, recordings, templates, and AI-powered social media content creation.",
        qes: "¿Qué es la membresía Premier?",
        aes: "La membresía Premier te da acceso a la sección de Recursos Premier y al Generador de Contenido para Redes Sociales. Estas herramientas incluyen documentos exclusivos, grabaciones, plantillas y creación de contenido para redes sociales con IA.",
      },
      {
        q: "How do I upgrade to Premier?",
        a: "Click on the \"Premier\" tab in the navigation and you will see a PayPal link to upgrade your membership.",
        qes: "¿Cómo me actualizo a Premier?",
        aes: "Haz clic en la pestaña \"Premier\" en la navegación y verás un enlace de PayPal para actualizar tu membresía.",
      },
    ],
  },
  {
    emoji: "🤖",
    title: "Content Generator / Generador de Contenido",
    subtitle: "Premier Members Only / Solo Miembros Premier",
    questions: [
      {
        q: "What is the Social Media Content Generator?",
        a: "It is an AI-powered tool that creates social media posts for Instagram, Facebook, LinkedIn, X/Twitter, and TikTok. You can generate content in English, Spanish, or both. You can also generate AI images and videos.",
        qes: "¿Qué es el Generador de Contenido para Redes Sociales?",
        aes: "Es una herramienta con IA que crea publicaciones para redes sociales en Instagram, Facebook, LinkedIn, X/Twitter y TikTok. Puedes generar contenido en inglés, español o ambos. También puedes generar imágenes y videos con IA.",
      },
      {
        q: "How do I generate a post?",
        a: "Select your platform, language, and tone. Then choose a Content Source: type a content idea, enter your agent/listing info, or paste a URL. Click \"Generate Post\" and the AI will create your content. You can copy it directly from the results.",
        qes: "¿Cómo genero una publicación?",
        aes: "Selecciona tu plataforma, idioma y tono. Luego elige una Fuente de Contenido: escribe una idea, ingresa información de tu agente/propiedad, o pega una URL. Haz clic en \"Generar Publicación\" y la IA creará tu contenido. Puedes copiarlo directamente desde los resultados.",
      },
      {
        q: "Is there a limit on how much content I can generate?",
        a: "AI image generation is limited to 1 image per day. AI video generation is limited to 1 video per day. Text post generation has no daily limit.",
        qes: "¿Hay un límite en cuánto contenido puedo generar?",
        aes: "La generación de imágenes con IA está limitada a 1 imagen por día. La generación de videos con IA está limitada a 1 video por día. La generación de publicaciones de texto no tiene límite diario.",
      },
    ],
  },
  {
    emoji: "📅",
    title: "Events / Eventos",
    questions: [
      {
        q: "How do I find KW CHISPA events?",
        a: "Click \"Events\" in the top navigation. You will see a calendar view of upcoming events, featured events, and recurring events. Click on any event to see details and register.",
        qes: "¿Cómo encuentro los eventos de KW CHISPA?",
        aes: "Haz clic en \"Eventos\" en la navegación superior. Verás una vista de calendario con próximos eventos, eventos destacados y eventos recurrentes. Haz clic en cualquier evento para ver los detalles y registrarte.",
      },
      {
        q: "How do I register for an event?",
        a: "Click on the event and then click the \"Register\" button. This will take you to the Eventbrite page where you can complete your registration.",
        qes: "¿Cómo me registro en un evento?",
        aes: "Haz clic en el evento y luego en el botón \"Registrarse\". Esto te llevará a la página de Eventbrite donde podrás completar tu registro.",
      },
    ],
  },
  {
    emoji: "🏛️",
    title: "Chapter Leaders / Líderes de Capítulo",
    subtitle: "Chapter Leaders Only / Solo Líderes de Capítulo",
    questions: [
      {
        q: "What is the Chapter Leaders section?",
        a: "This is a private resource library exclusively for KW CHISPA Chapter Leaders. It contains documents, logos, marketing materials, and other resources to help you lead your chapter.",
        qes: "¿Qué es la sección de Líderes de Capítulo?",
        aes: "Es una biblioteca de recursos privada exclusivamente para los Líderes de Capítulo de KW CHISPA. Contiene documentos, logos, materiales de marketing y otros recursos para ayudarte a liderar tu capítulo.",
      },
      {
        q: "How do I become a Chapter Leader?",
        a: "Click the \"Interested in Becoming a Chapter Leader?\" button on your Dashboard and complete the Google Form. The KW CHISPA leadership team will follow up with you.",
        qes: "¿Cómo me convierto en Líder de Capítulo?",
        aes: "Haz clic en el botón \"¿Interesado/a en ser Líder de Capítulo?\" en tu Panel y completa el formulario de Google. El equipo de liderazgo de KW CHISPA se pondrá en contacto contigo.",
      },
    ],
  },
];

export const FAQPage = () => {
  const { darkModeLogo, title } = useConfigurationContext();
  const navigate = useNavigate();
  const { identity, isPending } = useGetIdentity();

  if (isPending) return null;
  if (!identity) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-secondary shrink-0">
        <div className="px-4 py-3 flex items-center gap-3">
          <img src={darkModeLogo} alt={title} className="h-10" />
          <span className="text-secondary-foreground font-semibold text-lg">Central</span>
        </div>
        <div style={{ height: "3px", background: "linear-gradient(90deg, #CC0000 0%, #e6a817 50%, #CC0000 100%)" }} />
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">FAQ</h1>
        <p className="text-muted-foreground mb-8">Frequently Asked Questions / Preguntas Frecuentes</p>

        <div className="flex flex-col gap-10">
          {FAQ_SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                <span>{section.emoji}</span>
                <span>{section.title}</span>
              </h2>
              {section.subtitle && (
                <p className="text-sm text-muted-foreground italic mb-3">{section.subtitle}</p>
              )}
              <div className="flex flex-col gap-4 mt-3">
                {section.questions.map((item, i) => (
                  <div key={i} className="border-l-4 border-red-600 pl-4">
                    <p className="font-semibold text-sm mb-1">Q: {item.q}</p>
                    <p className="text-sm text-muted-foreground mb-3">{item.a}</p>
                    <p className="font-semibold text-sm mb-1 text-muted-foreground">P: {item.qes}</p>
                    <p className="text-sm text-muted-foreground">{item.aes}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t text-center">
          <p className="text-sm font-semibold">Still need help? / ¿Aún necesitas ayuda?</p>
          <p className="text-sm text-muted-foreground mt-1">
            Contact us at{" "}
            <a href="mailto:info@kwchispa.com" className="text-red-600 hover:underline">
              info@kwchispa.com
            </a>{" "}
            and someone will get back to you.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Contáctanos en{" "}
            <a href="mailto:info@kwchispa.com" className="text-red-600 hover:underline">
              info@kwchispa.com
            </a>{" "}
            y alguien se pondrá en contacto contigo.
          </p>
        </div>
      </main>

      <footer className="shrink-0 py-6 text-center border-t">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Go Back
        </button>
      </footer>
    </div>
  );
};

FAQPage.path = "/faq";
