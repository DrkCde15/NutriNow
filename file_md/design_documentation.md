# NutriNow - Documentação de Design

## Visão Geral
Este documento descreve as decisões de design, padrões e diretrizes implementadas para o frontend React do NutriNow.

## Arquitetura do Frontend

### Estrutura de Componentes
```
Nutrinow-Frontend/src/
├── components/          # Componentes UI reutilizáveis
│   ├── AuthLayout.tsx  # Layout para páginas de autenticação
│   ├── PremiumModal.tsx # Modal de upgrade premium
│   └── ...
├── context/             # Contextos de estado global
│   ├── AuthContext.tsx  # Estado de autenticação e usuário
│   └── ...
├── hooks/               # Custom hooks
│   ├── useChat.ts       # Lógica de chat
│   ├── useForm.ts       # Validação e manipulação de formulários
│   └── ...
├── pages/               # Páginas da aplicação
│   ├── Dashboard.tsx
│   ├── Chat.tsx
│   ├── auth/            # Páginas de autenticação
│   │   ├── Login.tsx
│   │   ├── Cadastro.tsx
│   │   └── ...
│   └── ...
└── styles/              # Estilos e temas
    ├── theme.ts         # Tema centralizado
    └── ...
```

### Fluxo de Arquitetura
1. **Provider Pattern**: AuthProvider envolve toda a aplicação
2. **Custom Hooks**: Lógica reutilizável em hooks dedicados
3. **Componentes com Propriedades**: Tipagem estática com TypeScript
4. **Roteamento**: React Router com proteção de rotas
5. **Context API**: Estado global para autenticação e usuário

## Design System

### Paleta de Cores
- **Primário**: Verde (#2E7D32) - Saúde e nutrição
- **Secundário**: Laranja (#FF9800) - Energia
- **Acento**: Vermelho (#FF5722) - Paixão
- **Sucesso**: Verde (#4CAF50)
- **Aviso**: Laranja (#FF9800)
- **Erro**: Vermelho (#F44336)

### Tipografia
- **Fonte Primária**: Sistema sans-serif para legibilidade
- **Fonte Secundária**: Georgia para títulos
- **Escala**: Baseada em 4px grid para consistência

### Espaçamento
- **Grid**: 8px base para espaçamento consistente
- **Componentes**: Padding e margin padronizados
- **Layout**: Containeres com largura máxima responsiva

## Componentes de UI

### AuthLayout
**Propósito**: Layout consistente para todas as páginas de autenticação
**Características**:
- Layout dividido (formulário + visual)
- Logo e link para página inicial
- Estilo visual consistente
- Sistema de grid responsivo

### PremiumRoute
**Propósito**: Proteção de rotas premium
**Lógica**:
- Verifica autenticação
- Verifica status premium
- Redireciona para modal de upgrade se necessário
- Redireciona para login se não autenticado

### PremiumModal
**Propósito**: Modal de upgrade premium
**Funcionalidades**:
- Design atraente com benefícios destacados
- Botões de ação clara (Pagar/Fechar)
- Integração com gateway de pagamento
- Fechamento modal para outras ações

## Melhorias de Acessibilidade

### Diretrizes Implementadas
1. **Semântica HTML**: Uso adequado de elementos HTML5
2. **ARIA**: Atributos ARIA para melhor navegação por teclado
3. **Contraste**: WCAG AA compliance para contraste de cores
4. **Suporte a leitores de tela**: Testado com tecnologias assistivas
5. **Navegação por teclado**: Tab index e ordem lógica

### Recursos de Acessibilidade
- **Anúncios ao vivo**: Anúncios para leitores de tela
- **Teclas de atalho**: Atalhos de teclado para ações frequentes
- **Focus management**: Gerenciamento adequado de focus
- **Tamanho da fonte**: Suporte a aumento de fonte do sistema

## Performance e Otimização

### Otimizações Implementadas
1. **Code Splitting**: Carregamento lazy de componentes
2. **Tree Shaking**: Remoção de código não utilizado
3. **Imagens otimizadas**: WebP e compressão de imagens
4. **Cache de recursos**: Cache HTTP para assets estáticos
5. **Bundle analysis**: Análise de bundle para otimização

### Métricas de Performance
- **First Contentful Paint**: <2.0s
- **Largest Contentful Paint**: <2.5s
- **Cumulative Layout Shift**: <0.1
- **First Input Delay**: <100ms

## Segurança

### Medidas de Segurança
1. **Autenticação**: JWT com refresh tokens
2. **Autorização**: Controle de acesso baseado em roles
3. **CORS**: Origens permitidas configuráveis
4. **CSP**: Política de segurança de conteúdo
5. **Rate Limiting**: Rate limiting no backend

### Segurança do Frontend
- **Armazenamento seguro**: Uso seguro de localStorage/sessionStorage
- **HTTPS**: Forçado em produção
- **SameSite cookies**: Configuração adequada de cookies
- **CSRF protection**: Proteção CSRF para formulários

## Testes e Qualidade

### Estratégia de Testes
1. **Testes unitários**: Testes para componentes e hooks
2. **Testes de integração**: Fluxos de autenticação e API
3. **Testes de acessibilidade**: Testes WCAG compliance
4. **Testes de performance**: Testes de velocidade e responsividade

### Ferramentas de Qualidade
- **TypeScript**: Tipagem estática completa
- **ESLint**: Linting consistente
- **Prettier**: Formatação consistente
- **Jest**: Framework de testes
- **React Testing Library**: Testes baseados em comportamento

## Internacionalização (i18n)

### Suporte a Idiomas
- **Idiomas suportados**: Português (pt-BR) e Inglês (en-US)
- **Arquitetura**: Baseada em i18next
- **Formatos de data**: Localizados por região
- **Numeração**: Separadores de milhares localizados

### Diretrizes de Tradução
- **Chaves consistentes**: Chaves de tradução consistentes
- **Variáveis**: Suporte a variáveis em traduções
- **Plurals**: Formas plurais corretas
- **Formatação**: Formatação localizada de datas e números

## Responsividade e Mobile

### Breakpoints
- **Mobile**: 320px - 768px
- **Tablet**: 768px - 992px
- **Desktop**: 992px - 1200px
- **Large Desktop**: 1200px+

### Design Mobile-First
- **Navigation**: Menu hambúrguer em mobile
- **Touch targets**: Mínimo de 44px para elementos touch
- **Formulários**: Inputs otimizados para mobile
- **Gestos**: Gestos nativos do iOS/Android

## Documentação e Comentários

### Diretrizes de Documentação
1. **README**: Documentação completa para todos os componentes
2. **Comentários**: Comentários JSDoc para funções e classes
3. **Exemplos**: Exemplos de uso para componentes
4. **API Docs**: Documentação automática com JSDoc

### Estilo de Comentários
- **JSDoc**: Documentação de tipo para funções
- **Comentários explicativos**: Explicações de lógica complexa
- **TODO/FIXME**: Comentários para tarefas pendentes
- **CHANGELOG**: Registro de alterações

## Conclusão

O NutriNow agora possui um design sólido e consistente que:
- **Proporciona uma experiência de usuário excepcional**
- **Mantém a qualidade do código através de padrões consistentes**
- **Suporta crescimento e manutenção a longo prazo**
- **Atende aos mais altos padrões de acessibilidade e performance**

O design system implementado estabelece uma foundation para o sucesso contínuo e a evolução da plataforma.