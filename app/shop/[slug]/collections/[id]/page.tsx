import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { CollectionClient } from "./CollectionClient"

export default async function CollectionPage({ params }: { params: { slug: string; id: string } }) {
  const { slug, id: collectionId } = params

  const [collection, products] = await Promise.all([
    prisma.collection.findFirst({
      where: {
        OR: [{ id: collectionId }, { slug: collectionId }],
        shop: { slug },
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    }),

    prisma.product.findMany({
      where: {
        shop: { slug },
        collections: {
          some: {
            OR: [{ collectionId }, { collection: { slug: collectionId } }],
          },
        },
      },
      include: {
        variants: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
  ])

  if (!collection) {
    notFound()
  }

  return <CollectionClient collection={collection} products={products} slug={slug} />
}

