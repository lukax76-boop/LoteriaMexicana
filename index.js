import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import App from './App';

console.log("🚀 INDEX.JS LOADED! Platform:", Platform.OS);

registerRootComponent(App);
