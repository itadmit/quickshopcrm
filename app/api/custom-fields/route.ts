import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Schema validation
const createCustomFieldSchema = z.object({
  shopId: z.string(),
  namespace: z.string().default("custom"),
  key: z.string().min(1).regex(/^[a-z0-9_]+$/, "Key must be lowercase alphanumeric with underscores"),
  label: z.string().min(1),
  type: z.enum(["TEXT", "RICH_TEXT", "DATE", "COLOR", "CHECKBOX", "NUMBER", "URL", "FILE"]),
  description: z.string().optional(),
  required: z.boolean().default(false),
  validations: z.any().optional(),
  scope: z.enum(["GLOBAL", "CATEGORY"]).default("GLOBAL"),
  categoryIds: z.array(z.string()).default([]),
  showInStorefront: z.boolean().default(false),
  position: z.number().default(0),
})

// GET /api/custom-fields - Get all custom field definitions for a shop
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get("shopId")
    const namespace = searchParams.get("namespace")
    const scope = searchParams.get("scope")

    if (!shopId) {
      return NextResponse.json(
        { error: "shopId is required" },
        { status: 400 }
      )
    }

    const where: any = { shopId }
    
    if (namespace) {
      where.namespace = namespace
    }
    
    if (scope) {
      where.scope = scope
    }

    const definitions = await prisma.customFieldDefinition.findMany({
      where,
      orderBy: { position: "asc" },
    })

    return NextResponse.json(definitions)
  } catch (error) {
    console.error("Error fetching custom fields:", error)
    return NextResponse.json(
      { error: "Failed to fetch custom fields" },
      { status: 500 }
    )
  }
}

// POST /api/custom-fields - Create new custom field definition
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createCustomFieldSchema.parse(body)

    // Check if key already exists in this namespace
    const existing = await prisma.customFieldDefinition.findUnique({
      where: {
        shopId_namespace_key: {
          shopId: data.shopId,
          namespace: data.namespace,
          key: data.key,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: `Key '${data.key}' already exists in namespace '${data.namespace}'` },
        { status: 400 }
      )
    }

    // Validate categoryIds if scope is CATEGORY
    if (data.scope === "CATEGORY" && data.categoryIds.length === 0) {
      return NextResponse.json(
        { error: "Category scope requires at least one category" },
        { status: 400 }
      )
    }

    const definition = await prisma.customFieldDefinition.create({
      data,
    })

    return NextResponse.json(definition, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating custom field:", error)
    return NextResponse.json(
      { error: "Failed to create custom field" },
      { status: 500 }
    )
  }
}

