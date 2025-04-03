
// Utility for managing Vapi Button state and visibility
import { toast } from "@/hooks/use-toast";

interface VapiButtonState {
  isVisible: boolean;
  isIdle: boolean;
  lastClickTime: number | null;
  hasEventListeners: boolean;
  element: HTMLElement | null;
}

class VapiButtonManager {
  private static instance: VapiButtonManager;
  private buttonState: VapiButtonState = {
    isVisible: false,
    isIdle: true,
    lastClickTime: null,
    hasEventListeners: false,
    element: null
  };
  private observers: MutationObserver[] = [];
  private intersectionObserver: IntersectionObserver | null = null;
  private stateChangeCallbacks: ((state: VapiButtonState) => void)[] = [];
  private isDebug = true;

  private constructor() {
    this.debug("VapiButtonManager initialized");
  }

  public static getInstance(): VapiButtonManager {
    if (!VapiButtonManager.instance) {
      VapiButtonManager.instance = new VapiButtonManager();
    }
    return VapiButtonManager.instance;
  }

  // Debug logging
  private debug(message: string, data?: any) {
    if (this.isDebug) {
      if (data) {
        console.log(`[VapiButtonManager] ${message}`, data);
      } else {
        console.log(`[VapiButtonManager] ${message}`);
      }
    }
  }

  // Start monitoring the Vapi button
  public startMonitoring(): void {
    this.debug("Starting button monitoring");
    this.stopMonitoring(); // Clean up any existing observers first
    
    // Look for the button immediately
    this.findVapiButton();
    
    // Set up DOM observer to detect when button is added to the DOM
    const domObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          this.findVapiButton();
        }
      });
    });
    
    domObserver.observe(document.body, { childList: true, subtree: true });
    this.observers.push(domObserver);
  }

  // Find the Vapi button in the DOM
  private findVapiButton(): void {
    const button = document.querySelector('[id^="vapi-support-btn"]') as HTMLElement;
    
    if (button && button !== this.buttonState.element) {
      this.debug("Found Vapi button", button);
      this.buttonState.element = button;
      this.buttonState.isVisible = this.checkVisibility(button);
      this.buttonState.isIdle = this.checkIdleState(button);
      
      // Observe button for attribute and class changes
      this.observeButtonChanges(button);
      
      // Set up intersection observer for visibility
      this.observeVisibility(button);
      
      // Attach click listener if not already done
      if (!this.buttonState.hasEventListeners) {
        this.attachButtonEvents(button);
      }
      
      // Notify of state change
      this.notifyStateChange();
    }
  }

  // Check if button is visible
  private checkVisibility(button: HTMLElement): boolean {
    const computedStyle = window.getComputedStyle(button);
    const isHidden = 
      computedStyle.display === 'none' || 
      computedStyle.visibility === 'hidden' || 
      button.getAttribute('aria-hidden') === 'true';
    
    return !isHidden;
  }

  // Check if button is in idle state
  private checkIdleState(button: HTMLElement): boolean {
    return (
      button.classList.contains('vapi-btn-is-idle') || 
      button.classList.contains('idle') || 
      button.classList.contains('inactive')
    );
  }

  // Observe button attribute and class changes
  private observeButtonChanges(button: HTMLElement): void {
    const attributeObserver = new MutationObserver((mutations) => {
      let stateChanged = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          if (mutation.attributeName === 'class') {
            const wasIdle = this.buttonState.isIdle;
            this.buttonState.isIdle = this.checkIdleState(button);
            
            if (wasIdle !== this.buttonState.isIdle) {
              this.debug(`Button idle state changed: ${wasIdle} -> ${this.buttonState.isIdle}`);
              stateChanged = true;
            }
          } else if (mutation.attributeName === 'style' || 
                     mutation.attributeName === 'aria-hidden') {
            const wasVisible = this.buttonState.isVisible;
            this.buttonState.isVisible = this.checkVisibility(button);
            
            if (wasVisible !== this.buttonState.isVisible) {
              this.debug(`Button visibility changed: ${wasVisible} -> ${this.buttonState.isVisible}`);
              stateChanged = true;
            }
          }
        }
      });
      
      if (stateChanged) {
        this.notifyStateChange();
      }
    });
    
    attributeObserver.observe(button, { 
      attributes: true, 
      attributeFilter: ['class', 'style', 'aria-hidden'] 
    });
    
    this.observers.push(attributeObserver);
  }

  // Use IntersectionObserver to detect visibility changes
  private observeVisibility(button: HTMLElement): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    
    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const wasVisible = this.buttonState.isVisible;
        this.buttonState.isVisible = entry.isIntersecting && this.checkVisibility(button);
        
        if (wasVisible !== this.buttonState.isVisible) {
          this.debug(`Button intersection visibility changed: ${wasVisible} -> ${this.buttonState.isVisible}`);
          this.notifyStateChange();
        }
      });
    }, { threshold: 0.1 });
    
    this.intersectionObserver.observe(button);
  }

  // Attach click events to the button
  private attachButtonEvents(button: HTMLElement): void {
    if (this.buttonState.hasEventListeners) return;
    
    button.addEventListener('click', () => {
      this.debug("Button clicked");
      this.buttonState.lastClickTime = Date.now();
      this.buttonState.isIdle = false;
      this.notifyStateChange();
    });
    
    // Also listen for click events on close buttons
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target && 
          (target.classList.contains('vapi-close-btn') || 
           target.classList.contains('vapi-overlay') ||
           target.getAttribute('aria-label') === 'Close' ||
           target.closest('[aria-label="Close"]'))) {
        this.debug("Vapi close action detected");
        this.buttonState.isIdle = true;
        this.notifyStateChange();
      }
    }, true);
    
    this.buttonState.hasEventListeners = true;
  }

  // Register callback for state changes
  public onStateChange(callback: (state: VapiButtonState) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  // Notify all callbacks about state change
  private notifyStateChange(): void {
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback({...this.buttonState});
      } catch (e) {
        console.error("Error in Vapi button state change callback:", e);
      }
    });
  }

  // Stop all observers
  public stopMonitoring(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    
    this.debug("Button monitoring stopped");
  }

  // Get current button state
  public getState(): VapiButtonState {
    return {...this.buttonState};
  }

  // Force check for updates (useful for polling as backup)
  public forceCheck(): VapiButtonState {
    if (this.buttonState.element) {
      const wasIdle = this.buttonState.isIdle;
      const wasVisible = this.buttonState.isVisible;
      
      this.buttonState.isIdle = this.checkIdleState(this.buttonState.element);
      this.buttonState.isVisible = this.checkVisibility(this.buttonState.element);
      
      if (wasIdle !== this.buttonState.isIdle || wasVisible !== this.buttonState.isVisible) {
        this.debug("Force check detected state change", this.buttonState);
        this.notifyStateChange();
      }
    } else {
      this.findVapiButton();
    }
    
    return {...this.buttonState};
  }

  // Helper method to determine if recording should be active
  public shouldRecordingBeActive(): boolean {
    // If button was clicked recently (last 5 seconds), recording should be active
    const recentlyClicked = this.buttonState.lastClickTime && 
                          (Date.now() - this.buttonState.lastClickTime < 5000);
    
    // Recording should be active if button is visible and NOT idle,
    // OR if it was recently clicked (to handle transition states)
    return (this.buttonState.isVisible && !this.buttonState.isIdle) || recentlyClicked;
  }
}

export default VapiButtonManager;
