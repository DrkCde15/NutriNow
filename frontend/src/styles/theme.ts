export const theme = {
  colors: {
    primary: '#2E7D32', // Verde escuro - saúde/nutrição
    primaryDark: '#1B5E20',
    primaryLight: '#66BB6A',
    secondary: '#FF9800', // Laranja - energia
    secondaryDark: '#F57C00',
    secondaryLight: '#FFB74D',
    accent: '#FF5722', // Vermelho - paixão
    accentDark: '#E64A19',
    accentLight: '#FF8A65',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    
    // Neutros
    white: '#FFFFFF',
    lightGray: '#F5F5F5',
    gray: '#9E9E9E',
    darkGray: '#616161',
    black: '#000000',
    
    // Estados
    overlay: 'rgba(0, 0, 0, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
    xxxl: '64px',
  },
  
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    round: '50%',
  },
  
  typography: {
    fontFamily: {
      primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
      secondary: 'Georgia, serif',
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      xxl: '24px',
      xxxl: '32px',
      display: '48px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  
  breakpoints: {
    sm: '576px',
    md: '768px',
    lg: '992px',
    xl: '1200px',
  },
  
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
  },
};

export type Theme = typeof theme;