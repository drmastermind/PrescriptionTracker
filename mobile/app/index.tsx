import { View, ActivityIndicator } from 'react-native'
import { useColorScheme } from 'react-native'
import { dark, light } from '../constants/theme'

export default function Index() {
  const scheme = useColorScheme()
  const c = scheme === 'dark' ? dark : light
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg }}>
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  )
}
