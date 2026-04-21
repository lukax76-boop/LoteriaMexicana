export const loteriaCards = [
  { id: 1, name: 'El gallo', emoji: '🐓' }, { id: 2, name: 'El diablito', emoji: '😈' }, { id: 3, name: 'La dama', emoji: '💃' },
  { id: 4, name: 'El catrín', emoji: '🕴️' }, { id: 5, name: 'El paraguas', emoji: '☂️' }, { id: 6, name: 'La sirena', emoji: '🧜‍♀️' },
  { id: 7, name: 'La escalera', emoji: '🪜' }, { id: 8, name: 'La botella', emoji: '🍾' }, { id: 9, name: 'El barril', emoji: '🛢️' },
  { id: 10, name: 'El árbol', emoji: '🌳' }, { id: 11, name: 'El melón', emoji: '🍈' }, { id: 12, name: 'El valiente', emoji: '🗡️' },
  { id: 13, name: 'El gorrito', emoji: '🧢' }, { id: 14, name: 'La muerte', emoji: '💀' }, { id: 15, name: 'La pera', emoji: '🍐' },
  { id: 16, name: 'La bandera', emoji: '🇲🇽' }, { id: 17, name: 'El bandolón', emoji: '🎸' }, { id: 18, name: 'El violoncello', emoji: '🎻' },
  { id: 19, name: 'La garza', emoji: '🦩' }, { id: 20, name: 'El pájaro', emoji: '🐦' }, { id: 21, name: 'La mano', emoji: '🖐️' },
  { id: 22, name: 'La bota', emoji: '👢' }, { id: 23, name: 'La luna', emoji: '🌙' }, { id: 24, name: 'El cotorro', emoji: '🦜' },
  { id: 25, name: 'El borracho', emoji: '🥴' }, { id: 26, name: 'El negrito', emoji: '👨🏿' }, { id: 27, name: 'El corazón', emoji: '❤️' },
  { id: 28, name: 'La sandía', emoji: '🍉' }, { id: 29, name: 'El tambor', emoji: '🥁' }, { id: 30, name: 'El camarón', emoji: '🦐' },
  { id: 31, name: 'Las jaras', emoji: '🏹' }, { id: 32, name: 'El músico', emoji: '🧑‍🎤' }, { id: 33, name: 'La araña', emoji: '🕷️' },
  { id: 34, name: 'El soldado', emoji: '🪖' }, { id: 35, name: 'La estrella', emoji: '⭐' }, { id: 36, name: 'El cazo', emoji: '🥘' },
  { id: 37, name: 'El mundo', emoji: '🌍' }, { id: 38, name: 'El apache', emoji: '🪶' }, { id: 39, name: 'El nopal', emoji: '🌵' },
  { id: 40, name: 'El alacrán', emoji: '🦂' }, { id: 41, name: 'La rosa', emoji: '🌹' }, { id: 42, name: 'La calavera', emoji: '☠️' },
  { id: 43, name: 'La campana', emoji: '🔔' }, { id: 44, name: 'El cantarito', emoji: '🏺' }, { id: 45, name: 'El venado', emoji: '🦌' },
  { id: 46, name: 'El sol', emoji: '☀️' }, { id: 47, name: 'La corona', emoji: '👑' }, { id: 48, name: 'La chalupa', emoji: '🛶' },
  { id: 49, name: 'El pino', emoji: '🌲' }, { id: 50, name: 'El pescado', emoji: '🐟' }, { id: 51, name: 'La palma', emoji: '🌴' },
  { id: 52, name: 'La maceta', emoji: '🪴' }, { id: 53, name: 'El arpa', emoji: '🎶' }, { id: 54, name: 'La rana', emoji: '🐸' }
];

export const getCardData = (id) => {
  return loteriaCards.find(c => c.id === id) || { id: 0, name: '?', emoji: '❓' };
};
