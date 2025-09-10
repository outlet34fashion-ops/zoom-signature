// Color palette with categories as requested by user
export const colorPalette = {
  'Neutrale Töne': {
    emoji: '⚪',
    colors: [
      { name: 'Weiß', value: '#FFFFFF' },
      { name: 'Schwarz', value: '#000000' },
      { name: 'Grau', value: '#808080' },
      { name: 'Grau Hell', value: '#D3D3D3' },
      { name: 'Grau Dunkel', value: '#696969' },
      { name: 'Beige Hell', value: '#F5F5DC' },
      { name: 'Beige Dunkel', value: '#DEB887' },
      { name: 'Sand', value: '#C2B280' },
      { name: 'Camel', value: '#C19A6B' },
      { name: 'Taupe', value: '#483C32' }
    ]
  },
  'Erd- & Brauntöne': {
    emoji: '🟤',
    colors: [
      { name: 'Mokka', value: '#3C2415' },
      { name: 'MUD', value: '#70543E' },
      { name: 'Chocolate', value: '#7B3F00' },
      { name: 'Rost', value: '#B7410E' }
    ]
  },
  'Rot & Rosé': {
    emoji: '🔴',
    colors: [
      { name: 'Rot', value: '#FF0000' },
      { name: 'Bordeaux', value: '#800020' },
      { name: 'Weinrot', value: '#722F37' },
      { name: 'Rosa', value: '#FFC0CB' },
      { name: 'Pink', value: '#FF69B4' }
    ]
  },
  'Orange & Peach': {
    emoji: '🧡',
    colors: [
      { name: 'Orange', value: '#FFA500' },
      { name: 'Lachs', value: '#FA8072' },
      { name: 'Peach', value: '#FFCBA4' }
    ]
  },
  'Gelb & Gold': {
    emoji: '💛',
    colors: [
      { name: 'Gelb', value: '#FFFF00' },
      { name: 'Butter', value: '#FFFF99' },
      { name: 'Gold', value: '#FFD700' }
    ]
  },
  'Grün-Töne': {
    emoji: '💚',
    colors: [
      { name: 'Grün', value: '#008000' },
      { name: 'Grün Hell', value: '#90EE90' },
      { name: 'Grün Dunkel', value: '#006400' },
      { name: 'Grün Apfel', value: '#8DB600' },
      { name: 'Oliv', value: '#808000' },
      { name: 'Salbei', value: '#9CAF88' },
      { name: 'Pistazie', value: '#93C572' },
      { name: 'Khaki', value: '#F0E68C' },
      { name: 'Mint', value: '#98FB98' }
    ]
  },
  'Blau-Töne': {
    emoji: '🔵',
    colors: [
      { name: 'Blau Hell', value: '#ADD8E6' },
      { name: 'Blau Dunkel', value: '#00008B' },
      { name: 'Blau Navi', value: '#000080' },
      { name: 'Blau Royal', value: '#4169E1' },
      { name: 'Türkis', value: '#40E0D0' },
      { name: 'Petrol', value: '#005F5F' }
    ]
  },
  'Lila-Töne': {
    emoji: '🟣',
    colors: [
      { name: 'Lila', value: '#800080' },
      { name: 'Flieder', value: '#B19CD9' }
    ]
  },
  'Metallic': {
    emoji: '✨',
    colors: [
      { name: 'Silber', value: '#C0C0C0' }
    ]
  }
};

// Get color value by name for display
export const getColorValue = (colorName) => {
  for (const category of Object.values(colorPalette)) {
    const color = category.colors.find(c => c.name === colorName);
    if (color) return color.value;
  }
  // Fallback colors for legacy colors
  const fallbackColors = {
    'Schwarz': '#000000',
    'Weiß': '#FFFFFF',
    'Blau': '#0066CC',
    'Rot': '#CC0000',
    'Beige': '#F5F5DC'
  };
  return fallbackColors[colorName] || '#CCCCCC';
};