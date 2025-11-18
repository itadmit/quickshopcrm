// Helper functions לבדיקה אם תוסף הביקורות פעיל

import { prisma } from '@/lib/prisma'
import { loadActivePlugins } from './loader'

/**
 * בדיקה אם תוסף הביקורות מותקן ופעיל לחנות/חברה
 */
export async function isReviewsPluginActive(shopId?: string, companyId?: string): Promise<boolean> {
  try {
    const activePlugins = await loadActivePlugins(shopId, companyId)
    return activePlugins.some(p => p.slug === 'reviews' && p.isActive && p.isInstalled)
  } catch (error) {
    console.error('Error checking reviews plugin:', error)
    return false
  }
}

/**
 * קבלת הגדרות תוסף הביקורות
 */
export async function getReviewsPluginConfig(shopId?: string, companyId?: string): Promise<any> {
  try {
    const activePlugins = await loadActivePlugins(shopId, companyId)
    const reviewsPlugin = activePlugins.find(p => p.slug === 'reviews')
    
    if (!reviewsPlugin) {
      // הגדרות ברירת מחדל אם התוסף לא מותקן
      return {
        requireApproval: true,
        allowAnonymous: false,
        allowVideos: true,
        allowImages: true,
        maxImages: 5,
        maxVideos: 1,
        verifyPurchase: true,
        enableReplies: false,
        enableQnA: false,
      }
    }
    
    return reviewsPlugin.config || {}
  } catch (error) {
    console.error('Error getting reviews plugin config:', error)
    return {}
  }
}

