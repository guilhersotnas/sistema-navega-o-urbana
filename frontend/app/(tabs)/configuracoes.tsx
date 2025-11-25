import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

// Cores baseadas nas suas definições anteriores
const BLUE = '#007AFF'; // Cor principal dos itens ativos
const LIGHT_GRAY = '#F2F2F7'; // Fundo do container de itens/boxes
const DARK_GRAY = '#555';
const GRAY_DIVIDER = '#E5E5EA';

// --- Dados Mockados para os Modos de Transporte ---
const modosTransporte = [
    { id: 'carro', name: 'Carro', icon: 'car' },
    { id: 'bicicleta', name: 'Bicicleta', icon: 'bicycle' },
    { id: 'a_pe', name: 'A pé', icon: 'walking' },
    { id: 'transporte_publico', name: 'Transporte público', icon: 'bus' },
];

// --- Componentes Reutilizáveis (para clareza) ---

interface RadioItemProps {
    name: string; // O nome é uma string (ex: 'Carro')
    icon: string; // O nome do ícone é uma string (ex: 'car')
    isSelected: boolean; // É um booleano (true/false)
    onPress: () => void; // É uma função que não retorna nada
    isLast: boolean; // É um booleano
}
// Item para seleção (Modo de Transporte)
const RadioItem: React.FC<RadioItemProps> = ({ name, icon, isSelected, onPress, isLast }) => (
    <TouchableOpacity
        style={[styles.listItem, isLast ? { borderBottomWidth: 0 } : {}]}
        onPress={onPress}
    >
        <FontAwesome5 name={icon as React.ComponentProps<typeof FontAwesome5>['name']} size={20} color={DARK_GRAY} style={styles.listIcon} />
        <Text style={styles.listText}>{name}</Text>
        {isSelected && <Ionicons name="checkmark" size={24} color={BLUE} />}
    </TouchableOpacity>
);

interface ToggleItemProps {
    label: string; // O texto de preferência é uma string
    value: boolean; // O estado do Switch é um booleano (true/false)
    onValueChange: (value: boolean) => void; // A função de callback recebe um booleano
    isLast: boolean; // É um booleano
}
// Item para preferência (Toggle)
const ToggleItem: React.FC<ToggleItemProps> = ({ label, value, onValueChange, isLast }) => (
    <View style={[styles.listItem, isLast ? { borderBottomWidth: 0 } : {}]}>
        <Text style={styles.listText}>{label}</Text>
        <Switch
            trackColor={{ false: LIGHT_GRAY, true: BLUE }}
            // Note que o thumbColor pode ser '#fff' ou cores sólidas
            thumbColor={'#fff'}
            ios_backgroundColor={LIGHT_GRAY}
            onValueChange={onValueChange}
            value={value}
        />
    </View>
);

// --- Tela Principal ---
export default function ConfiguracoesScreen() {
    // Estado para o modo de transporte selecionado
    const [modoSelecionado, setModoSelecionado] = useState('carro');
    // Estados para as preferências (Toggles)
    const [evitarMaoUnica, setEvitarMaoUnica] = useState(false);
    const [priorizarCiclovias, setPriorizarCiclovias] = useState(true);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

            {/* Título Grande (Header) */}
            <Text style={styles.headerTitle}>Configurações</Text>

            {/* Seção 1: Modo de Transporte */}
            <Text style={styles.sectionTitle}>Modo de transporte</Text>
            <View style={styles.listContainer}>
                {modosTransporte.map((modo, index) => (
                    <RadioItem
                        key={modo.id}
                        name={modo.name}
                        icon={modo.icon}
                        isSelected={modoSelecionado === modo.id}
                        onPress={() => setModoSelecionado(modo.id)}
                        isLast={index === modosTransporte.length - 1}
                    />
                ))}
            </View>

            {/* Seção 2: Preferências */}
            <Text style={[styles.sectionTitle, { marginTop: 25 }]}>Preferências</Text>
            <View style={styles.listContainer}>
                <ToggleItem
                    label="Evitar ruas de mão única"
                    value={evitarMaoUnica}
                    onValueChange={setEvitarMaoUnica}
                    isLast={false}
                />
                <ToggleItem
                    label="Priorizar ciclovias"
                    value={priorizarCiclovias}
                    onValueChange={setPriorizarCiclovias}
                    isLast={true} // Último item sem borda
                />
            </View>
        </ScrollView>
    );
}

// --- Estilos ---
const styles = StyleSheet.create({
    container: {

        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        paddingTop: Platform.OS === 'ios' ? 70 : 20, // Espaço para o título no iOS
        paddingHorizontal: 20,
        paddingBottom: 40,
        marginTop: 10,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 30,
        color: '#000',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: DARK_GRAY,
        marginBottom: 10,
    },
    listContainer: {
        backgroundColor: '#fff', // Fundo branco dentro do box
        borderRadius: 12,
        overflow: 'hidden', // Importante para as bordas não vazarem
        // Sombra sutil para destacar a "caixa" de configurações
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: GRAY_DIVIDER,
        backgroundColor: '#fff',
    },
    listIcon: {
        width: 30, // Garante que o ícone tenha espaço fixo
    },
    listText: {
        flex: 1, // Faz o texto ocupar o máximo de espaço antes do ícone/switch
        fontSize: 17,
        color: '#000',
        marginLeft: 10,
    },
});