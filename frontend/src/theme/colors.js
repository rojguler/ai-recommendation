const palette = {
  // Color palette from design
  deepBlue: '#4E49A5', // Deep Blue
  orangeWine: '#EAAC2F', // Orange Wine
  cream: '#F2D9BD', // Cream
  olives: '#89892B', // Olives
  brine: '#5E6122', // Brine
  creamSoft: '#FFFFFF', // Pure white
  creamLight: '#FFFFFF', // White
  creamWarm: '#FFFFFF', // White
  // Accent colors
  softPink: '#F2D9BD', // Cream
  softBeige: '#F2D9BD', // Cream
  softLavender: '#4E49A5', // Deep Blue
  softMint: '#89892B', // Olives
  // Text colors - Apple style (clear and readable)
  textDark: '#1D1D1F', // Apple's dark text
  textMedium: '#3A3A3C', // Medium gray
  textLight: '#6E6E73', // Light gray
  textMuted: '#8E8E93', // Muted gray
  // Button colors - using palette harmoniously
  greenPrimary: '#89892B', // Olives
  greenSecondary: '#5E6122', // Brine
  greenDark: '#5E6122' // Brine
};

export const gradients = {
  aurora: `linear-gradient(135deg, ${palette.orangeWine} 0%, ${palette.deepBlue} 100%)`,
  dusk: `linear-gradient(135deg, ${palette.deepBlue} 0%, ${palette.brine} 100%)`,
  daylight: `linear-gradient(135deg, ${palette.creamSoft} 0%, ${palette.creamSoft} 100%)`,
  grove: `linear-gradient(135deg, ${palette.olives} 0%, ${palette.deepBlue} 100%)`,
  green: `linear-gradient(135deg, ${palette.olives} 0%, ${palette.deepBlue} 100%)`,
  greenLight: `linear-gradient(135deg, ${palette.deepBlue} 0%, ${palette.olives} 100%)`
};

export default palette;

