# Team Prompts for Parallel Development

This directory contains detailed prompts for each team in the Mailcow MCP server project. Each prompt is designed for a different AI assistant to work simultaneously on different parts of the project.

## 🎯 How to Use These Prompts

### For AI Assistants:
1. **Choose your team** from the available team prompts
2. **Read your team's prompt** thoroughly
3. **Follow the implementation guidelines** in your prompt
4. **Reference the README files** mentioned in your prompt
5. **Implement your assigned components** following the patterns
6. **Write tests** for your components
7. **Update documentation** as you implement

### For Project Managers:
1. **Assign teams** to different AI assistants
2. **Monitor progress** using the success criteria in each prompt
3. **Coordinate integration** between teams
4. **Resolve conflicts** between team interfaces
5. **Ensure quality** through testing and documentation

## 📋 Available Team Prompts

### Phase 1: Core Infrastructure
- **Team A**: `Team_A_Types_Configuration.md` - Types and Configuration
- **Team B**: `Team_B_Authentication_Security.md` - Authentication and Security
- **Team C**: `Team_C_API_Client.md` - API Client and HTTP Layer
- **Team D**: `Team_D_Utilities_Logging.md` - Utilities and Logging

### Phase 2: MCP Implementation
- **Team E**: `Team_E_Tool_Registry.md` - Tool Registry and Base Classes
- **Team F**: `Team_F_Resource_Registry.md` - Resource Registry and Base Classes
- **Team G**: `Team_G_Main_Server.md` - Main Server Entry Point
- **Team H**: `Team_H_Error_Handling.md` - Error Handling and Validation

### Phase 3: Domain-Specific Implementation
- **Team I**: `Team_I_Domain_Management.md` - Domain Management
- **Team J**: `Team_J_Mailbox_Management.md` - Mailbox Management
- **Team K**: `Team_K_Alias_Management.md` - Alias Management
- **Team L**: `Team_L_System_Management.md` - System Management

### Phase 4: Advanced Features
- **Team M**: `Team_M_Spam_Management.md` - Spam Management
- **Team N**: `Team_N_Log_Management.md` - Log Management
- **Team O**: `Team_O_Testing_Framework.md` - Testing Framework
- **Team P**: `Team_P_Documentation_Examples.md` - Documentation and Examples

## 🔄 Development Workflow

### 1. Parallel Development Phase
- All teams work simultaneously on their assigned components
- Teams communicate through shared interfaces and types
- Each team creates their own test files
- Teams use mock implementations for dependencies

### 2. Integration Phase
- Teams integrate their components with the main server
- Fix interface mismatches and dependencies
- Update imports and exports
- Resolve circular dependencies

### 3. Testing Phase
- Run unit tests for each component
- Run integration tests
- Fix bugs and issues
- Update documentation

### 4. Final Integration
- All components work together
- End-to-end testing
- Performance optimization
- Security audit

## 📝 Team Communication Guidelines

### Interface Contracts
Each team must define clear interfaces for their components:

```typescript
// Example: Team A defines types that Team B uses
export interface AuthConfig {
  enabled: boolean;
  sessionTimeout: number;
  tokenRefreshThreshold: number;
}

// Team B implements the interface
export class AuthManager implements AuthConfig {
  // Implementation
}
```

### Mock Implementations
Teams should create mock implementations for dependencies:

```typescript
// Team C creates mock for Team B's auth
export class MockAuthManager {
  async validateAPIKey(key: string): Promise<boolean> {
    return key.length > 0;
  }
}
```

### Shared Constants
Define shared constants in a central location:

```typescript
// src/constants/index.ts
export const API_ENDPOINTS = {
  DOMAINS: '/api/v1/domains',
  MAILBOXES: '/api/v1/mailboxes',
  ALIASES: '/api/v1/aliases',
} as const;
```

## 🚀 Getting Started

### For Each Team:

1. **Read the README files** in your assigned directories
2. **Understand the dependencies** and interfaces you need to implement
3. **Create mock implementations** for dependencies you don't have yet
4. **Implement your components** following the documentation
5. **Write tests** for your components
6. **Update documentation** as you implement

### Example Team Assignment:

**Team I (Domain Management) should:**
1. Read `src/tools/README.md` and `src/resources/README.md`
2. Read `src/api/README.md` for API patterns
3. Implement domain tools following the tool patterns
4. Implement domain resources following the resource patterns
5. Implement domain API endpoints
6. Write tests for all components
7. Update documentation

## 🎯 Success Criteria

### For Each Team:
- [ ] All assigned files are implemented
- [ ] All interfaces are properly defined
- [ ] All dependencies are resolved
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Documentation is complete
- [ ] Code follows TypeScript best practices
- [ ] Error handling is comprehensive
- [ ] Security considerations are addressed

### For the Complete Project:
- [ ] All teams' components integrate successfully
- [ ] End-to-end tests pass
- [ ] Performance meets requirements
- [ ] Security audit passes
- [ ] Documentation is complete and accurate
- [ ] Examples work correctly
- [ ] Deployment is successful

## 🔧 Development Tools

### Required Tools for Each Team:
- TypeScript compiler
- ESLint for code quality
- Prettier for code formatting
- Jest for testing
- Git for version control

### Team-Specific Tools:
- **Teams A, B, C, D**: Core infrastructure tools
- **Teams E, F, G, H**: MCP protocol tools
- **Teams I-P**: Domain-specific tools and testing

## 📊 Progress Tracking

### Daily Standup Questions:
1. What did you implement yesterday?
2. What are you implementing today?
3. What blockers do you have?
4. What interfaces do you need from other teams?

### Weekly Review:
1. Review integration points between teams
2. Identify and resolve interface conflicts
3. Update shared documentation
4. Plan next week's priorities

## 🚨 Important Notes

### 1. Interface Stability
- Once defined, interfaces should be stable
- Use semantic versioning for interface changes
- Provide migration guides for breaking changes
- Document all public APIs thoroughly

### 2. Testing Strategy
- Each team writes their own tests
- Use mock implementations for dependencies
- Write integration tests for critical paths
- Test error handling thoroughly

### 3. Documentation
- Document all public interfaces
- Include usage examples
- Document error conditions
- Keep documentation up to date

### 4. Security
- Follow security best practices
- Validate all inputs
- Handle sensitive data properly
- Log security events appropriately

## 📞 Team Communication

### Communication Channels:
- Use clear interface contracts
- Document breaking changes
- Share mock implementations
- Communicate integration issues

### Conflict Resolution:
- Identify interface conflicts early
- Negotiate interface changes
- Provide clear migration paths
- Test integration thoroughly

This parallel development approach allows multiple AI assistants to work simultaneously on different parts of the project, significantly reducing development time while maintaining code quality and consistency. 