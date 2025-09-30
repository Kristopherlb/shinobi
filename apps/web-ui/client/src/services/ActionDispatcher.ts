// Action dispatcher service that handles command execution results
import type { CommandAction } from '@shared/contracts/commands';

export interface IActionDispatcher {
  dispatch(action: CommandAction): Promise<void>;
}

export interface ActionServices {
  navigate: (path: string) => void;
  showToast: (toast: { title?: string; description: string; variant?: 'default' | 'destructive' }) => void;
}

export class ActionDispatcher implements IActionDispatcher {
  private services: ActionServices;

  constructor(services: ActionServices) {
    this.services = services;
  }

  async dispatch(action: CommandAction): Promise<void> {
    switch (action.type) {
      case 'navigate':
        this.handleNavigation(action.data);
        break;
      case 'modal':
        this.handleModal(action.data);
        break;
      case 'toast':
        this.handleToast(action.data);
        break;
      case 'reload':
        window.location.reload();
        break;
      case 'callback':
        if (typeof action.data === 'function') {
          action.data();
        }
        break;
      default:
        console.warn('Unknown action type:', action.type);
    }
  }

  private handleNavigation(data: any) {
    if (typeof data === 'string') {
      console.log('Navigation action:', data);
      this.services.navigate(data);
    }
  }

  private handleModal(data: any) {
    console.log('Modal action:', data);
    // Show toast notification for modal actions since we don't have a modal service yet
    this.services.showToast({
      title: 'Command Executed',
      description: `Would open ${data.type || 'modal'} in the real application`,
    });
  }

  private handleToast(data: any) {
    console.log('Toast action:', data);
    this.services.showToast({
      title: data.title,
      description: data.message || 'Command executed successfully',
      variant: data.variant || 'default'
    });
  }
}