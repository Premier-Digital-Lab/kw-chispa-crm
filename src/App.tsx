import { CRM } from "@/components/atomic-crm/root/CRM";
import AIChatbot from "@/components/AIChatbot";

/**
 * Application entry point
 *
 * Customize KW CHISPA CRM by passing props to the CRM component:
 *  - companySectors
 *  - darkTheme
 *  - dealCategories
 *  - dealPipelineStatuses
 *  - dealStages
 *  - lightTheme
 *  - logo
 *  - noteStatuses
 *  - taskTypes
 *  - title
 * ... as well as all the props accepted by shadcn-admin-kit's <Admin> component.
 *
 * @example
 * const App = () => (
 *    <CRM
 *       logo="./img/logo.png"
 *       title="Acme CRM"
 *    />
 * );
 */
const App = () => (
	<>
		<CRM />
		<AIChatbot />
	</>
);

export default App;
