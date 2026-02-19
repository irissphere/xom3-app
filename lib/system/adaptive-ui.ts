// Adaptive UI Engine - Smart Interface Adjustments
// Personalizes the cockpit based on usage patterns
// Tasks 36-40: Full Adaptive Interface System

export interface UIComponent {
  id: string;
  type: "action" | "button" | "menu" | "panel" | "widget";
  label: string;
  location: string; // "header", "sidebar", "quick-actions", etc.
  visible: boolean;
  order: number;
  usageCount: number;
  lastUsed?: string;
}

export interface UIPreferences {
  userId: string;
  components: UIComponent[];
  layout: {
    quickActionsOrder: string[];
    sidebarCollapsed: boolean;
    defaultView: string;
    hiddenSections: string[]; // Task 38: Auto-hidden sections
    collapsedSections: string[]; // Task 38: Auto-collapsed sections
  };
  shortcuts: Record<string, string>; // action -> keyboard shortcut
  autofillRules: AutofillRule[]; // Task 39: Predictive autofill
  contextPanels: ContextPanelConfig[]; // Task 40: Context-aware panels
  lastUpdated: string;
}

export interface AutofillRule {
  id: string;
  field: string;
  page?: string;
  workflow?: string;
  value: any;
  confidence: number; // 0-1
  usageCount: number; // How many times this value was used
  lastUsed: string;
}

export interface ContextPanelConfig {
  id: string;
  panelType: string;
  workflowState?: string;
  conditions: Array<{
    field: string;
    operator: "equals" | "contains" | "greater_than" | "less_than";
    value: any;
  }>;
  visible: boolean;
  priority: number; // Higher priority panels shown first
}

/**
 * Get user UI preferences
 */
export function getUserUIPreferences(userId: string): UIPreferences {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`ui_preferences_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (err) {
    console.error("[Adaptive UI] Failed to load preferences:", err);
  }

  // Return default preferences
  return getDefaultPreferences(userId);
}

/**
 * Get default UI preferences
 */
function getDefaultPreferences(userId: string): UIPreferences {
  return {
    userId,
    components: [],
    layout: {
      quickActionsOrder: [],
      sidebarCollapsed: false,
      defaultView: "dashboard",
      hiddenSections: [],
      collapsedSections: [],
    },
    shortcuts: {},
    autofillRules: [],
    contextPanels: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Update component usage
 */
export function trackComponentUsage(
  userId: string,
  componentId: string,
  componentType: UIComponent["type"],
  label: string,
  location: string
): void {
  const preferences = getUserUIPreferences(userId);
  
  // Find or create component
  let component = preferences.components.find(c => c.id === componentId);
  if (!component) {
    component = {
      id: componentId,
      type: componentType,
      label,
      location,
      visible: true,
      order: preferences.components.length,
      usageCount: 0,
    };
    preferences.components.push(component);
  }

  // Update usage
  component.usageCount++;
  component.lastUsed = new Date().toISOString();
  preferences.lastUpdated = new Date().toISOString();

  // Auto-hide rarely used components (used less than 3 times in last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (component.lastUsed && new Date(component.lastUsed) < thirtyDaysAgo && component.usageCount < 3) {
    component.visible = false;
  }

  // Reorder components by usage frequency
  preferences.components.sort((a, b) => b.usageCount - a.usageCount);
  preferences.components.forEach((c, idx) => {
    c.order = idx;
  });

  // Update quick actions order
  const quickActions = preferences.components
    .filter(c => c.location === "quick-actions" && c.visible)
    .sort((a, b) => b.usageCount - a.usageCount)
    .map(c => c.id);
  preferences.layout.quickActionsOrder = quickActions;

  savePreferences(preferences);
}

/**
 * Save UI preferences
 */
function savePreferences(preferences: UIPreferences): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(`ui_preferences_${preferences.userId}`, JSON.stringify(preferences));
    }
  } catch (err) {
    console.error("[Adaptive UI] Failed to save preferences:", err);
  }
}

/**
 * Get visible components for a location
 */
export function getVisibleComponents(
  userId: string,
  location: string
): UIComponent[] {
  const preferences = getUserUIPreferences(userId);
  return preferences.components
    .filter(c => c.location === location && c.visible)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get quick actions in order
 */
export function getQuickActionsOrder(userId: string): string[] {
  const preferences = getUserUIPreferences(userId);
  return preferences.layout.quickActionsOrder;
}

/**
 * Toggle component visibility
 */
export function toggleComponentVisibility(
  userId: string,
  componentId: string,
  visible: boolean
): void {
  const preferences = getUserUIPreferences(userId);
  const component = preferences.components.find(c => c.id === componentId);
  if (component) {
    component.visible = visible;
    preferences.lastUpdated = new Date().toISOString();
    savePreferences(preferences);
  }
}

/**
 * Reorder components
 */
export function reorderComponents(
  userId: string,
  componentIds: string[]
): void {
  const preferences = getUserUIPreferences(userId);
  
  componentIds.forEach((id, index) => {
    const component = preferences.components.find(c => c.id === id);
    if (component) {
      component.order = index;
    }
  });

  preferences.layout.quickActionsOrder = componentIds;
  preferences.lastUpdated = new Date().toISOString();
  savePreferences(preferences);
}

/**
 * Get recommended actions based on usage
 */
export function getRecommendedActions(userId: string, limit: number = 5): UIComponent[] {
  const preferences = getUserUIPreferences(userId);
  return preferences.components
    .filter(c => c.type === "action" && c.visible)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit);
}

/**
 * Get component usage stats
 */
export function getComponentStats(userId: string): {
  totalComponents: number;
  visibleComponents: number;
  hiddenComponents: number;
  mostUsed: UIComponent[];
  leastUsed: UIComponent[];
} {
  const preferences = getUserUIPreferences(userId);
  const visible = preferences.components.filter(c => c.visible);
  const hidden = preferences.components.filter(c => !c.visible);
  
  const sorted = [...preferences.components].sort((a, b) => b.usageCount - a.usageCount);

  return {
    totalComponents: preferences.components.length,
    visibleComponents: visible.length,
    hiddenComponents: hidden.length,
    mostUsed: sorted.slice(0, 5),
    leastUsed: sorted.slice(-5).reverse(),
  };
}

/**
 * Task 37: Get personalized quick actions for an agent
 */
export function getPersonalizedQuickActions(userId: string, limit: number = 8): UIComponent[] {
  const preferences = getUserUIPreferences(userId);
  
  // Get most frequently used actions in quick-actions location
  const quickActions = preferences.components
    .filter(c => c.location === "quick-actions" && c.visible && c.type === "action")
    .sort((a, b) => {
      // Sort by usage count, then by last used
      if (b.usageCount !== a.usageCount) {
        return b.usageCount - a.usageCount;
      }
      if (a.lastUsed && b.lastUsed) {
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      }
      return 0;
    })
    .slice(0, limit);

  return quickActions;
}

/**
 * Task 38: Auto-hide or collapse rarely used sections
 */
export function autoAdjustLayout(userId: string): void {
  const preferences = getUserUIPreferences(userId);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  // Find sections (components with location containing "section")
  const sections = preferences.components.filter(c => 
    c.location.includes("section") || c.location.includes("panel")
  );

  for (const section of sections) {
    const lastUsed = section.lastUsed ? new Date(section.lastUsed) : null;
    const daysSinceUse = lastUsed 
      ? (Date.now() - lastUsed.getTime()) / (24 * 60 * 60 * 1000)
      : Infinity;

    // Hide if not used in 30 days and used less than 5 times total
    if (daysSinceUse > 30 && section.usageCount < 5) {
      if (!preferences.layout.hiddenSections.includes(section.id)) {
        preferences.layout.hiddenSections.push(section.id);
        section.visible = false;
      }
    }
    // Collapse if not used in 14 days but used more than 5 times
    else if (daysSinceUse > 14 && section.usageCount >= 5) {
      if (!preferences.layout.collapsedSections.includes(section.id)) {
        preferences.layout.collapsedSections.push(section.id);
      }
    }
  }

  preferences.lastUpdated = new Date().toISOString();
  savePreferences(preferences);
}

/**
 * Task 38: Check if a section should be hidden
 */
export function isSectionHidden(userId: string, sectionId: string): boolean {
  const preferences = getUserUIPreferences(userId);
  return preferences.layout.hiddenSections.includes(sectionId);
}

/**
 * Task 38: Check if a section should be collapsed
 */
export function isSectionCollapsed(userId: string, sectionId: string): boolean {
  const preferences = getUserUIPreferences(userId);
  return preferences.layout.collapsedSections.includes(sectionId);
}

/**
 * Task 39: Add autofill rule based on usage pattern
 */
export function addAutofillRule(
  userId: string,
  field: string,
  value: any,
  page?: string,
  workflow?: string
): void {
  const preferences = getUserUIPreferences(userId);
  
  // Find existing rule for this field
  let rule = preferences.autofillRules.find(
    r => r.field === field && r.page === page && r.workflow === workflow
  );

  if (rule) {
    // Update existing rule
    rule.usageCount++;
    rule.lastUsed = new Date().toISOString();
    // Update confidence based on usage
    rule.confidence = Math.min(0.9, 0.5 + (rule.usageCount / 20));
  } else {
    // Create new rule
    rule = {
      id: `autofill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      field,
      page,
      workflow,
      value,
      confidence: 0.5,
      usageCount: 1,
      lastUsed: new Date().toISOString(),
    };
    preferences.autofillRules.push(rule);
  }

  preferences.lastUpdated = new Date().toISOString();
  savePreferences(preferences);
}

/**
 * Task 39: Get autofill value for a field
 */
export function getAutofillValue(
  userId: string,
  field: string,
  page?: string,
  workflow?: string
): { value: any; confidence: number } | null {
  const preferences = getUserUIPreferences(userId);
  
  // Find best matching rule
  const rules = preferences.autofillRules.filter(r => r.field === field);
  
  if (rules.length === 0) return null;

  // Prefer rules matching page/workflow context
  let bestRule = rules.find(r => r.page === page && r.workflow === workflow);
  if (!bestRule) {
    bestRule = rules.find(r => r.page === page);
  }
  if (!bestRule) {
    bestRule = rules.find(r => r.workflow === workflow);
  }
  if (!bestRule) {
    // Use most confident rule
    bestRule = rules.sort((a, b) => b.confidence - a.confidence)[0];
  }

  if (!bestRule || bestRule.confidence < 0.3) return null;

  return {
    value: bestRule.value,
    confidence: bestRule.confidence,
  };
}

/**
 * Task 40: Add context-aware panel configuration
 */
export function addContextPanel(
  userId: string,
  panelType: string,
  conditions: Array<{
    field: string;
    operator: "equals" | "contains" | "greater_than" | "less_than";
    value: any;
  }>,
  workflowState?: string,
  priority: number = 1
): void {
  const preferences = getUserUIPreferences(userId);
  
  const panel: ContextPanelConfig = {
    id: `panel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    panelType,
    workflowState,
    conditions,
    visible: true,
    priority,
  };

  preferences.contextPanels.push(panel);
  preferences.lastUpdated = new Date().toISOString();
  savePreferences(preferences);
}

/**
 * Task 40: Get context-aware panels for current state
 */
export function getContextPanels(
  userId: string,
  currentState: {
    workflowState?: string;
    fields?: Record<string, any>;
  }
): ContextPanelConfig[] {
  const preferences = getUserUIPreferences(userId);
  
  // Filter panels that match current context
  const matchingPanels = preferences.contextPanels.filter(panel => {
    // Check workflow state match
    if (panel.workflowState && currentState.workflowState !== panel.workflowState) {
      return false;
    }

    // Check condition matches
    if (panel.conditions.length > 0 && currentState.fields) {
      for (const condition of panel.conditions) {
        const fieldValue = currentState.fields[condition.field];
        
        switch (condition.operator) {
          case "equals":
            if (fieldValue !== condition.value) return false;
            break;
          case "contains":
            if (typeof fieldValue === "string" && !fieldValue.includes(condition.value)) {
              return false;
            }
            break;
          case "greater_than":
            if (typeof fieldValue !== "number" || fieldValue <= condition.value) {
              return false;
            }
            break;
          case "less_than":
            if (typeof fieldValue !== "number" || fieldValue >= condition.value) {
              return false;
            }
            break;
        }
      }
    }

    return true;
  });

  // Sort by priority (higher first)
  return matchingPanels
    .filter(p => p.visible)
    .sort((a, b) => b.priority - a.priority);
}
