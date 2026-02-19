// Lazy Loading Engine - Task 48
// Load UI components only when needed

export interface LazyComponent {
  id: string;
  name: string;
  path: string; // Component path/route
  loadPriority: "high" | "medium" | "low";
  preload: boolean; // Should preload on idle
  loaded: boolean;
  loadTime?: number; // milliseconds
  lastAccessed?: number;
}

export interface LazyLoadConfig {
  components: Map<string, LazyComponent>;
  preloadOnIdle: boolean;
  preloadDelay: number; // milliseconds to wait before preloading
}

/**
 * Lazy Loading Engine
 */
export class LazyLoadingEngine {
  private config: LazyLoadConfig = {
    components: new Map(),
    preloadOnIdle: true,
    preloadDelay: 2000, // 2 seconds
  };

  private loadedComponents: Set<string> = new Set();
  private loadingPromises: Map<string, Promise<any>> = new Map();

  /**
   * Register a component for lazy loading
   */
  registerComponent(
    id: string,
    name: string,
    path: string,
    priority: "high" | "medium" | "low" = "medium",
    preload: boolean = false
  ): void {
    this.config.components.set(id, {
      id,
      name,
      path,
      loadPriority: priority,
      preload,
      loaded: false,
    });
  }

  /**
   * Load component dynamically
   */
  async loadComponent(id: string): Promise<any> {
    // Check if already loaded
    if (this.loadedComponents.has(id)) {
      return;
    }

    // Check if already loading
    const existingPromise = this.loadingPromises.get(id);
    if (existingPromise) {
      return existingPromise;
    }

    const component = this.config.components.get(id);
    if (!component) {
      throw new Error(`Component ${id} not registered`);
    }

    const startTime = Date.now();

    // Create loading promise
    const loadPromise = this.doLoadComponent(component).then((loaded) => {
      component.loaded = true;
      component.loadTime = Date.now() - startTime;
      component.lastAccessed = Date.now();
      this.loadedComponents.add(id);
      this.loadingPromises.delete(id);
      return loaded;
    });

    this.loadingPromises.set(id, loadPromise);
    return loadPromise;
  }

  /**
   * Actually load the component
   */
  private async doLoadComponent(component: LazyComponent): Promise<any> {
    // In a real implementation, this would use dynamic imports
    // For now, we'll simulate with a delay based on priority
    const delay = component.loadPriority === "high" ? 0 : component.loadPriority === "medium" ? 100 : 300;
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // In production, this would be:
    // return await import(component.path);
    
    return { component: component.name, path: component.path };
  }

  /**
   * Preload components on idle
   */
  preloadOnIdle(): void {
    if (!this.config.preloadOnIdle) return;

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(() => {
        setTimeout(() => {
          this.preloadComponents();
        }, this.config.preloadDelay);
      });
    }
  }

  /**
   * Preload high-priority components
   */
  private async preloadComponents(): Promise<void> {
    const toPreload = Array.from(this.config.components.values())
      .filter(c => c.preload && !c.loaded && c.loadPriority === "high")
      .slice(0, 3); // Preload max 3 at a time

    for (const component of toPreload) {
      try {
        await this.loadComponent(component.id);
      } catch (error) {
        console.warn(`[Lazy Loading] Failed to preload ${component.id}:`, error);
      }
    }
  }

  /**
   * Check if component is loaded
   */
  isLoaded(id: string): boolean {
    return this.loadedComponents.has(id);
  }

  /**
   * Get component load status
   */
  getComponentStatus(id: string): {
    loaded: boolean;
    loading: boolean;
    loadTime?: number;
  } {
    return {
      loaded: this.loadedComponents.has(id),
      loading: this.loadingPromises.has(id),
      loadTime: this.config.components.get(id)?.loadTime,
    };
  }

  /**
   * Get all registered components
   */
  getComponents(): LazyComponent[] {
    return Array.from(this.config.components.values());
  }

  /**
   * Set preload configuration
   */
  setPreloadConfig(enabled: boolean, delay: number = 2000): void {
    this.config.preloadOnIdle = enabled;
    this.config.preloadDelay = delay;
  }
}

// Global instance
export const lazyLoader = new LazyLoadingEngine();
