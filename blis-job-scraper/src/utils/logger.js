/**
 * Simple logger utility
 */
class Logger {
  constructor() {
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      dim: '\x1b[2m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m'
    };
  }

  info(message) {
    console.log(`${this.colors.blue}ℹ${this.colors.reset} ${message}`);
  }

  success(message) {
    console.log(`${this.colors.green}✓${this.colors.reset} ${message}`);
  }

  warning(message) {
    console.log(`${this.colors.yellow}⚠${this.colors.reset} ${message}`);
  }

  error(message) {
    console.log(`${this.colors.red}✗${this.colors.reset} ${message}`);
  }

  debug(message) {
    console.log(`${this.colors.dim}${message}${this.colors.reset}`);
  }

  section(title) {
    console.log(`\n${this.colors.bright}${this.colors.cyan}${title}${this.colors.reset}`);
    console.log(`${this.colors.dim}${'='.repeat(title.length)}${this.colors.reset}`);
  }
}

export const logger = new Logger();
export default logger;

// Made with Bob
