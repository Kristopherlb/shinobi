export const testEnv = 'TestScaffoldingLoaded';

export class TestHarness {
  private components: any[] = [];

  addComponent(component: any) {
    this.components.push(component);
  }

  getComponents() {
    return [...this.components];
  }

  clear() {
    this.components = [];
  }
}
