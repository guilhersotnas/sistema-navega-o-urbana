import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform } from "react-native";

// Cores definidas no seu arquivo index.js
const BLUE = '#007AFF';
const DARK_GRAY = '#555';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: BLUE,
        tabBarInactiveTintColor: DARK_GRAY,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.08,
              shadowRadius: 5,
            },
            android: {
              elevation: 8,
            },
          }),
          // Aqui, como há apenas 3 itens, o espaço será dividido perfeitamente por 3
          height: 60,
          paddingBottom: 5,
        },
      }}
    >
      {/* Telas Principais (Com Abas) - APENAS AS 3 ABAS VISÍVEIS */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="historico"
        options={{
          title: "Histórico",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="configuracoes"
        options={{
          title: "Configurações",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" color={color} size={size} />
          ),
        }}
      />

      {/* AS ENTRADAS PARA 'resultadoRota' e 'navegacaoAtiva' FORAM REMOVIDAS.
        Elas não devem estar aqui se você as moveu para fora de (tabs)/.
      */}
    </Tabs>
  );
}