'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { getOwnerClient } from '@/lib/auth/require-owner';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { normalizeArtworkStatus } from '@/lib/catalog';

function getStoragePathFromPublicUrl(url: string | null | undefined, bucket: string) {
  if (!url) return null;
  const marker = `/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length).split('?')[0] || null;
}

// Every dashboard action runs as the signed-in studio owner, so RLS still applies and no other account can write.
async function getAuthenticatedDashboardClient() {
  const { client, error } = await getOwnerClient();
  return { client, error } as const;
}

/** Public pages that show archive data; refreshed after every change so the website updates on its own. */
function revalidatePublicSite() {
  revalidatePath('/', 'layout');
}

// 2. Add new artwork
export async function addArtworkAction(formData: FormData) {
  try {
    const { client: supabase, error: authError } = await getAuthenticatedDashboardClient();
    if (!supabase) {
      return { success: false, error: authError };
    }

    const title = formData.get('title') as string;
    const inventory_number = formData.get('inventory_number') as string;
    const medium = formData.get('medium') as string;
    const dimensions = formData.get('dimensions') as string;
    const yearStr = formData.get('year') as string;
    const priceStr = formData.get('price') as string;
    const is_price_visible = formData.get('is_price_visible') !== 'false';
    const currency = formData.get('currency') as string;
    const status = formData.get('status') as string;
    const series = formData.get('series') as string;
    const category = formData.get('category') as string;
    const collection = formData.get('collection') as string;
    const on_consignment = formData.get('on_consignment') === 'true';
    const consignment_location = formData.get('consignment_location') as string;
    const provenance = formData.get('provenance') as string;
    const exhibition_history = formData.get('exhibition_history') as string;
    const publications = formData.get('publications') as string;
    const location = formData.get('location') as string;
    const notes = formData.get('notes') as string;
    const imageFile = formData.get('image') as File | null;

    let imageUrl = null;
    if (imageFile && imageFile.size > 0) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const fileName = `${uuidv4()}.jpg`;
      const filePath = `artworks/${fileName}`;

      // Upload with service role
      const { error: uploadError } = await supabase.storage
        .from('artwork-images')
        .upload(filePath, buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: imageFile.type || 'image/jpeg',
        });

      if (uploadError) {
        return { success: false, error: `Image upload failed: ${uploadError.message}` };
      }

      const { data: urlData } = supabase.storage.from('artwork-images').getPublicUrl(filePath);
      imageUrl = urlData.publicUrl;
    }

    const { error: insertError } = await supabase
      .from('artworks')
      .insert({
        title,
        inventory_number: inventory_number.trim() || null,
        medium: medium || null,
        dimensions: dimensions || null,
        year: yearStr ? parseInt(yearStr, 10) : null,
        price: priceStr ? Number(priceStr) : null,
        is_price_visible,
        currency: currency || 'USD',
        status: normalizeArtworkStatus(status),
        series: series.trim() || null,
        category: category.trim() || null,
        collection: collection.trim() || null,
        on_consignment,
        consignment_location: on_consignment ? (consignment_location || null) : null,
        provenance: provenance.trim() || null,
        exhibition_history: exhibition_history
          ? exhibition_history.split('\n').map((item) => item.trim()).filter(Boolean)
          : [],
        publications: publications.trim() || null,
        location: location.trim() || null,
        image_url: imageUrl,
        notes: notes || null,
      });

    if (insertError) {
      return { success: false, error: `Database error: ${insertError.message}` };
    }

    revalidatePath('/studio/archive');
    revalidatePublicSite();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 3. Update existing artwork
export async function updateArtworkAction(id: string, formData: FormData) {
  try {
    const { client: supabase, error: authError } = await getAuthenticatedDashboardClient();
    if (!supabase) {
      return { success: false, error: authError };
    }

    const title = formData.get('title') as string;
    const inventory_number = formData.get('inventory_number') as string;
    const medium = formData.get('medium') as string;
    const dimensions = formData.get('dimensions') as string;
    const yearStr = formData.get('year') as string;
    const priceStr = formData.get('price') as string;
    const is_price_visible = formData.get('is_price_visible') !== 'false';
    const currency = formData.get('currency') as string;
    const status = formData.get('status') as string;
    const series = formData.get('series') as string;
    const category = formData.get('category') as string;
    const collection = formData.get('collection') as string;
    const on_consignment = formData.get('on_consignment') === 'true';
    const consignment_location = formData.get('consignment_location') as string;
    const provenance = formData.get('provenance') as string;
    const exhibition_history = formData.get('exhibition_history') as string;
    const publications = formData.get('publications') as string;
    const location = formData.get('location') as string;
    const notes = formData.get('notes') as string;
    const newImageFile = formData.get('image') as File | null;
    const currentImageUrl = formData.get('currentImageUrl') as string || null;

    let finalImageUrl = currentImageUrl;

    if (newImageFile && newImageFile.size > 0) {
      // Delete old image from storage if it exists
      const oldPath = getStoragePathFromPublicUrl(currentImageUrl, 'artwork-images');
      if (oldPath) {
        await supabase.storage.from('artwork-images').remove([oldPath]);
      }

      const buffer = Buffer.from(await newImageFile.arrayBuffer());
      const fileName = `${uuidv4()}.jpg`;
      const filePath = `artworks/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('artwork-images')
        .upload(filePath, buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: newImageFile.type || 'image/jpeg',
        });

      if (uploadError) {
        return { success: false, error: `Image upload failed: ${uploadError.message}` };
      }

      const { data: urlData } = supabase.storage.from('artwork-images').getPublicUrl(filePath);
      finalImageUrl = urlData.publicUrl;
    }

    const { error: updateError } = await supabase
      .from('artworks')
      .update({
        title,
        inventory_number: inventory_number.trim() || null,
        medium: medium || null,
        dimensions: dimensions || null,
        year: yearStr ? parseInt(yearStr, 10) : null,
        price: priceStr ? Number(priceStr) : null,
        is_price_visible,
        currency: currency || 'USD',
        status: normalizeArtworkStatus(status),
        series: series.trim() || null,
        category: category.trim() || null,
        collection: collection.trim() || null,
        on_consignment,
        consignment_location: on_consignment ? (consignment_location || null) : null,
        provenance: provenance.trim() || null,
        exhibition_history: exhibition_history
          ? exhibition_history.split('\n').map((item) => item.trim()).filter(Boolean)
          : [],
        publications: publications.trim() || null,
        location: location.trim() || null,
        image_url: finalImageUrl,
        notes: notes || null,
      })
      .eq('id', id);

    if (updateError) {
      return { success: false, error: `Database error: ${updateError.message}` };
    }

    revalidatePath('/studio/archive');
    revalidatePath(`/studio/archive/${id}`);
    revalidatePublicSite();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 4. Delete artwork
export async function deleteArtworkAction(id: string) {
  try {
    const { client: supabase, error: authError } = await getAuthenticatedDashboardClient();
    if (!supabase) {
      return { success: false, error: authError };
    }

    // Fetch the artwork first to get its image URL so we can delete from storage
    const { data: artwork, error: fetchError } = await supabase
      .from('artworks')
      .select('image_url')
      .eq('id', id)
      .single();

    if (fetchError) {
      return { success: false, error: `Failed to fetch artwork: ${fetchError.message}` };
    }

    if (artwork?.image_url) {
      const path = getStoragePathFromPublicUrl(artwork.image_url, 'artwork-images');
      if (path) {
        await supabase.storage.from('artwork-images').remove([path]);
      }
    }

    const { error: deleteError } = await supabase
      .from('artworks')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return { success: false, error: `Failed to delete artwork from database: ${deleteError.message}` };
    }

    revalidatePath('/studio/archive');
    revalidatePublicSite();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 5. Record a sale
interface SaleData {
  artwork_id: string;
  buyer_name: string;
  sale_date: string;
  sale_price: number;
  commission_percentage: number;
  discount: number;
  notes: string;
}

export async function addSaleAction(data: SaleData) {
  try {
    const { client: supabase, error: authError } = await getAuthenticatedDashboardClient();
    if (!supabase) {
      return { success: false, error: authError };
    }

    const { error: saleError } = await supabase.from('sales').insert({
      artwork_id: data.artwork_id,
      buyer_name: data.buyer_name.trim() || null,
      sale_date: data.sale_date,
      sale_price: data.sale_price,
      commission_percentage: data.commission_percentage,
      discount: data.discount,
      status: 'paid',
      notes: data.notes.trim() || null,
    });

    if (saleError) {
      return { success: false, error: `Failed to insert sale: ${saleError.message}` };
    }

    const { error: artworkError } = await supabase
      .from('artworks')
      .update({
        status: 'Sold',
        sale_price: data.sale_price,
      })
      .eq('id', data.artwork_id);

    if (artworkError) {
      return { success: false, error: `Failed to update artwork status: ${artworkError.message}` };
    }

    revalidatePath('/studio/sales');
    revalidatePath('/studio/archive');
    revalidatePublicSite();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 6. Remove a sale
export async function deleteSaleAction(id: string) {
  try {
    const { client: supabase, error: authError } = await getAuthenticatedDashboardClient();
    if (!supabase) {
      return { success: false, error: authError };
    }

    const { data: sale, error: fetchError } = await supabase
      .from('sales')
      .select('artwork_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      return { success: false, error: `Failed to fetch sale: ${fetchError.message}` };
    }

    const artworkId = sale?.artwork_id ?? null;

    const { error: deleteError } = await supabase
      .from('sales')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return { success: false, error: `Failed to remove sale: ${deleteError.message}` };
    }

    if (artworkId) {
      const { data: remainingSales, error: remainingError } = await supabase
        .from('sales')
        .select('id')
        .eq('artwork_id', artworkId)
        .limit(1);

      if (remainingError) {
        return {
          success: false,
          error: `Sale removed, but artwork status could not be refreshed: ${remainingError.message}`,
        };
      }

      if (!remainingSales || remainingSales.length === 0) {
        const { error: artworkError } = await supabase
          .from('artworks')
          .update({
            status: 'Available',
            sale_price: null,
          })
          .eq('id', artworkId)
          .eq('status', 'Sold');

        if (artworkError) {
          return {
            success: false,
            error: `Sale removed, but artwork status could not be updated: ${artworkError.message}`,
          };
        }
      }
    }

    revalidatePath('/studio/sales');
    revalidatePath('/studio/archive');
    revalidatePublicSite();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 7. Toggle archive status
export async function toggleArchiveArtworkAction(id: string, nextStatus: string) {
  try {
    const { client: supabase, error: authError } = await getAuthenticatedDashboardClient();
    if (!supabase) {
      return { success: false, error: authError };
    }

    const { error } = await supabase
      .from('artworks')
      .update({ status: nextStatus })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/studio/archive');
    revalidatePublicSite();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 8. Control whether an artwork price is shown on the public portfolio.
export async function setArtworkPublicPriceVisibilityAction(id: string, isPriceVisible: boolean) {
  try {
    const { client: supabase, error: authError } = await getAuthenticatedDashboardClient();
    if (!supabase) return { success: false, error: authError };

    const { error } = await supabase
      .from('artworks')
      .update({ is_price_visible: isPriceVisible })
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/studio/archive');
    revalidatePath(`/studio/archive/${id}`);
    revalidatePublicSite();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function setArtworkFeaturedAction(id: string, isFeatured: boolean) {
  try {
    const { client: supabase, error: authError } = await getAuthenticatedDashboardClient();
    if (!supabase) return { success: false, error: authError };

    if (isFeatured) {
      const { count, error: countError } = await supabase
        .from('artworks')
        .select('id', { count: 'exact', head: true })
        .eq('is_featured', true);
      if (countError) return { success: false, error: countError.message };
      if ((count ?? 0) >= 10) {
        return { success: false, error: 'Only 10 artworks can be featured. Unfeature one first.' };
      }
    }

    const { error } = await supabase.from('artworks').update({ is_featured: isFeatured }).eq('id', id);
    if (error) return { success: false, error: error.message };

    revalidatePath('/studio/archive');
    revalidatePath('/studio/archive/catalog');
    revalidatePublicSite();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

interface UpdateSaleData extends SaleData {
  id: string;
}

export async function updateSaleAction(data: UpdateSaleData) {
  try {
    const { client: supabase, error: authError } = await getAuthenticatedDashboardClient();
    if (!supabase) return { success: false, error: authError };

    const { error: saleError } = await supabase
      .from('sales')
      .update({
        artwork_id: data.artwork_id,
        buyer_name: data.buyer_name.trim() || null,
        sale_date: data.sale_date,
        sale_price: data.sale_price,
        commission_percentage: data.commission_percentage,
        discount: data.discount,
        notes: data.notes.trim() || null,
      })
      .eq('id', data.id);
    if (saleError) return { success: false, error: saleError.message };

    const { error: artworkError } = await supabase
      .from('artworks')
      .update({ status: 'Sold', sale_price: data.sale_price })
      .eq('id', data.artwork_id);
    if (artworkError) return { success: false, error: artworkError.message };

    revalidatePath('/studio/sales');
    revalidatePath('/studio/archive');
    revalidatePublicSite();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 9. Get Artist Profile
export async function getArtistProfileAction() {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('artist_profile')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }
    
    const mappedData = data ? {
      ...data,
      website: data.website ?? data.website_url ?? null,
      bio: data.bio ?? data.biography ?? null,
      statement: data.statement ?? data.artist_statement ?? null,
      profile_photo_url: data.profile_photo_url ?? data.photo_url ?? null
    } : null;
    
    return { success: true, data: mappedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
