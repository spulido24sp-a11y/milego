export class BaseIntegration {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.enabled = false;
  }

  async connect() {
    throw new Error(`${this.name}: connect() not implemented`);
  }

  async disconnect() {
    throw new Error(`${this.name}: disconnect() not implemented`);
  }

  async handle(event, data) {
    throw new Error(`${this.name}: handle() not implemented`);
  }
}