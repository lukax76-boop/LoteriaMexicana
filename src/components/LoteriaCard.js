import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getCardData } from '../config/cards';

export default function LoteriaCard({ id, style, emojiSize = 40, nameSize = 10, numSize = 12 }) {
  const card = getCardData(id);

  return (
    <View style={[styles.card, style]}>
      <Text style={[styles.number, { fontSize: numSize }]}>{card.id}</Text>
      <View style={styles.imageContainer}>
        <Text style={{ fontSize: emojiSize }}>{card.emoji}</Text>
      </View>
      <Text style={[styles.name, { fontSize: nameSize }]} numberOfLines={1}>
        {card.name.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FCE4EC',
    borderWidth: 2,
    borderColor: '#E91E63',
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 2,
  },
  number: {
    alignSelf: 'flex-start',
    fontWeight: 'bold',
    color: '#E91E63',
    marginLeft: 2,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontWeight: 'bold',
    color: '#E91E63',
    textAlign: 'center',
    marginBottom: 2,
    width: '100%',
  }
});
