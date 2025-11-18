import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateAppearanceSettings() {
  try {
    // מציאת החנות adika
    const shop = await prisma.shop.findUnique({
      where: { slug: 'adika' },
      select: { id: true, themeSettings: true }
    })

    if (!shop) {
      console.log('❌ חנות adika לא נמצאה')
      return
    }

    console.log('📦 חנות נמצאה:', shop.id)
    
    const currentSettings = (shop.themeSettings as any) || {}
    
    // עדכון ההגדרות
    const updatedSettings = {
      ...currentSettings,
      categoryRemoveCardBorders: true,
      categoryImageBorderRadius: 0,
      categoryShowSizeButtons: true,
      categorySizeButtonPosition: 'on-image',
      categoryShowOnlyInStock: true,
      categoryShowColorSamples: true,
    }

    // שמירה
    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        themeSettings: updatedSettings
      }
    })

    console.log('✅ ההגדרות עודכנו בהצלחה!')
    console.log('📋 הגדרות חדשות:')
    console.log('  - categoryRemoveCardBorders:', updatedSettings.categoryRemoveCardBorders)
    console.log('  - categoryImageBorderRadius:', updatedSettings.categoryImageBorderRadius)
    console.log('  - categoryShowSizeButtons:', updatedSettings.categoryShowSizeButtons)
    console.log('  - categorySizeButtonPosition:', updatedSettings.categorySizeButtonPosition)
    console.log('  - categoryShowOnlyInStock:', updatedSettings.categoryShowOnlyInStock)
    console.log('  - categoryShowColorSamples:', updatedSettings.categoryShowColorSamples)

  } catch (error) {
    console.error('❌ שגיאה:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateAppearanceSettings()

