
### A) Import Satırları

```typescript
import { ReaderBlockRenderer, Block } from '../components/ReaderBlockRenderer';
```

### B) JSON Data Load Satırları

```typescript
// Örnek: Slug'a göre dinamik data require
// Not: React Native'de dynamic require kısıtlıdır, statik map önerilir.
const RISALE_DATA: Record<string, any> = {
    'birinci_soz': require('../../../assets/data/birinci_soz.json'),
    'ornek_eser': require('../samples/ornek_eser.json'),
};

const data = RISALE_DATA[slug] || RISALE_DATA['ornek_eser'];
const blocks: Block[] = data.blocks;
const presets = data.presets;
```

### C) FlatList RenderItem Bloğu

```typescript
const renderItem = React.useCallback(({ item }: { item: Block }) => {
    return (
        <ReaderBlockRenderer 
            block={item} 
            presets={presets} 
            baseFontSize={baseFontSize} 
        />
    );
}, [presets, baseFontSize]);

return (
    <FlatList
        data={blocks}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        // ... diğer props
    />
);
```
