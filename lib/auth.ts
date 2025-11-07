import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

// בדיקה שה-NEXTAUTH_SECRET מוגדר
if (!process.env.NEXTAUTH_SECRET) {
  console.warn("⚠️  NEXTAUTH_SECRET לא מוגדר! אנא הגדר אותו בקובץ .env")
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "אימייל", type: "email" },
        password: { label: "סיסמה", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("נא למלא אימייל וסיסמה")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { company: true }
        })

        if (!user) {
          throw new Error("משתמש לא נמצא")
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error("סיסמה שגויה")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          companyName: user.company.name,
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // אם זה Google OAuth
      if (account?.provider === "google") {
        try {
          // בדיקה אם המשתמש כבר קיים
          let existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
            include: { company: true }
          })

          // אם המשתמש לא קיים, יצירת משתמש חדש
          if (!existingUser) {
            // יצירת חברה, משתמש ומנוי נסיון
            const trialEndDate = new Date()
            trialEndDate.setDate(trialEndDate.getDate() + 7)

            const company = await prisma.company.create({
              data: {
                name: `${user.name}'s Company`,
                plan: "free",
              }
            })

            existingUser = await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name || "User",
                password: "", // אין סיסמה ב-OAuth
                role: "ADMIN",
                companyId: company.id,
              },
              include: { company: true }
            })

            // יצירת מנוי נסיון
            await prisma.subscription.create({
              data: {
                companyId: company.id,
                plan: "TRIAL",
                status: "TRIAL",
                trialStartDate: new Date(),
                trialEndDate: trialEndDate,
              }
            })
          }

          // עדכון המידע ב-user object
          user.id = existingUser.id
          user.role = existingUser.role
          user.companyId = existingUser.companyId
          user.companyName = existingUser.company.name
        } catch (error) {
          console.error("Error in Google sign in:", error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      try {
        if (user) {
          token.id = user.id
          token.name = user.name
          token.role = user.role
          token.companyId = user.companyId
          token.companyName = user.companyName
        }
        
        // אם זה Google OAuth, עדכון המידע מה-DB
        if (account?.provider === "google" && token.email) {
          try {
            const existingUser = await prisma.user.findUnique({
              where: { email: token.email as string },
              include: { company: true }
            })
            
            if (existingUser) {
              token.id = existingUser.id
              token.name = existingUser.name
              token.role = existingUser.role
              token.companyId = existingUser.companyId
              token.companyName = existingUser.company.name
            }
          } catch (error) {
            console.error("Error updating token from Google:", error)
          }
        }
        
        // בדיקה שהמשתמש עדיין קיים בכל פעם ש-JWT מתעדכן
        if (token.id) {
          try {
            const existingUser = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { id: true, email: true, name: true, role: true, companyId: true },
            })
            
            if (!existingUser) {
              // המשתמש נמחק - נחזיר null כדי להפסיק את ה-session
              return null as any
            }
            
            // עדכון הנתונים מה-DB
            token.id = existingUser.id
            token.name = existingUser.name
            token.role = existingUser.role
            token.companyId = existingUser.companyId
          } catch (error) {
            console.error('Error checking user in JWT callback:', error)
            return null as any
          }
        }
        
        return token
      } catch (error: any) {
        // טיפול בשגיאות פענוח JWT (כאשר יש cookies ישנים)
        if (error?.message?.includes('decryption') || error?.name === 'JWEDecryptionFailed') {
          console.warn('⚠️  שגיאת פענוח JWT - כנראה יש cookies ישנים. נא למחוק cookies ולנסות שוב.')
          // מחזירים null כדי לאפשר התחברות מחדש
          return null as any
        }
        throw error
      }
    },
    async session({ session, token }) {
      try {
        // אם token הוא null, המשתמש נמחק או יש בעיה עם ה-JWT - נחזיר session ריק
        if (!token || !token.id) {
          return null as any
        }
        
        // בדיקה נוספת שהמשתמש עדיין קיים
        try {
          const existingUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { id: true, email: true, name: true, role: true, companyId: true },
          })
          
          if (!existingUser) {
            // המשתמש נמחק - נחזיר null
            return null as any
          }
          
          if (session.user) {
            session.user.id = existingUser.id
            session.user.name = existingUser.name
            session.user.role = existingUser.role
            session.user.companyId = existingUser.companyId
            session.user.companyName = token.companyName as string
          }
        } catch (error) {
          console.error('Error checking user in session callback:', error)
          return null as any
        }
        
        return session
      } catch (error: any) {
        // טיפול בשגיאות פענוח JWT
        if (error?.message?.includes('decryption') || error?.name === 'JWEDecryptionFailed') {
          console.warn('⚠️  שגיאת פענוח JWT ב-session - כנראה יש cookies ישנים.')
          return null as any
        }
        throw error
      }
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // לוגים לניפוי באגים
      console.log("✅ התחברות מוצלחת:", user.email)
    },
    async signOut({ session, token }) {
      console.log("👋 התנתקות:", session?.user?.email || token?.email)
    },
  },
  debug: process.env.NODE_ENV === "development",
}


