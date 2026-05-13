/**
 * BarTalk v8 — Context Barrel
 * Re-export di tutti gli hook dei context per import puliti.
 */

export { useSettingsContext } from './SettingsContext';
export { useConversationContext } from './ConversationContext';
export { useAgentContext } from './AgentContext';
export { useTaskContext } from './TaskContext';
export { useCourseContext } from './CourseContext';
export { useAuthContext } from './AuthContext';
export { useUIContext } from './UIContext';
export { useBillingContext } from './BillingContext';
export { useMaestroContext, MaestroProvider } from './MaestroContext';
export { useLTI } from './LTIContext';
export { useXAPI } from './xAPIContext';
