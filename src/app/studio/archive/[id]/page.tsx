'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { updateArtworkAction, deleteArtworkAction } from '@/app/actions/db';
import { Artwork } from '@/lib/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, Save, Trash2, Upload, X } from 'lucide-react';
import { ARTWORK_STATUS_OPTIONS, formatExhibitionHistory, normalizeArtworkStatus } from '@/lib/catalog';
import { compressArtworkImage } from '@/lib/compress-image';
import { toast } from 'sonner';
import Link from 'next/link';


export default function ArtworkDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Single image replacement state
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string>('');

  const [formData, setFormData] = useState({
    inventory_number: '',
    title: '',
    medium: '',
    dimensions: '',
    year: '',
    price: '',
    is_price_visible: true,
    currency: 'USD',
    status: 'Available',
    series: '',
    category: '',
    collection: '',
    on_consignment: false,
    consignment_location: '',
    provenance: '',
    exhibition_history: '',
    publications: '',
    location: '',
    notes: '',
  });

  const supabase = useMemo(() => createClient(), []);

  const loadArtwork = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      if (data) {
        setArtwork(data as Artwork);
        setFormData({
          inventory_number: data.inventory_number || '',
          title: data.title || '',
          medium: data.medium || '',
          dimensions: data.dimensions || '',
          year: data.year ? data.year.toString() : '',
          price: data.price !== null && data.price !== undefined ? String(data.price) : '',
          is_price_visible: data.is_price_visible !== false,
          currency: data.currency || 'USD',
          status: normalizeArtworkStatus(data.status),
          series: data.series || '',
          category: data.category || '',
          collection: data.collection || '',
          on_consignment: data.on_consignment || false,
          consignment_location: data.consignment_location || '',
          provenance: data.provenance || '',
          exhibition_history: formatExhibitionHistory(data.exhibition_history),
          publications: data.publications || '',
          location: data.location || '',
          notes: data.notes || '',
        });
      }
    } catch (err: any) {
      toast.error('Failed to load artwork details: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [params.id, supabase]);

  useEffect(() => {
    if (params.id) loadArtwork();
  }, [params.id, loadArtwork]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      const file = acceptedFiles[0];
      setNewImageFile(file);
      setNewImagePreview(URL.createObjectURL(file));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 10485760,
  });

  const removeNewImage = () => {
    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
    }
    setNewImageFile(null);
    setNewImagePreview('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artwork) return;
    if (!formData.title.trim()) {
      toast.error('Please enter an artwork title');
      return;
    }

    setSaving(true);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('inventory_number', formData.inventory_number);
      data.append('medium', formData.medium);
      data.append('dimensions', formData.dimensions);
      data.append('year', formData.year);
      data.append('price', formData.price);
      data.append('is_price_visible', String(formData.is_price_visible));
      data.append('currency', formData.currency);
      data.append('status', formData.status);
      data.append('series', formData.series);
      data.append('category', formData.category);
      data.append('collection', formData.collection);
      data.append('on_consignment', String(formData.on_consignment));
      data.append('consignment_location', formData.consignment_location);
      data.append('provenance', formData.provenance);
      data.append('exhibition_history', formData.exhibition_history);
      data.append('publications', formData.publications);
      data.append('location', formData.location);
      data.append('notes', formData.notes);
      data.append('currentImageUrl', artwork.image_url || '');

      if (newImageFile) {
        const originalSize = (newImageFile.size / 1024).toFixed(0);
        const compressedImage = await compressArtworkImage(newImageFile);
        const compressedSize = (compressedImage.size / 1024).toFixed(0);
        toast(`Uploading compressed image: ${originalSize}KB → ${compressedSize}KB`);
        data.append('image', compressedImage);
      }

      const result = await updateArtworkAction(artwork.id, data);
      if (!result.success) throw new Error(result.error);

      toast.success('Artwork updated successfully');
      setNewImageFile(null);
      setNewImagePreview('');
      await loadArtwork();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update artwork');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!artwork) return;
    setDeleting(true);

    try {
      const result = await deleteArtworkAction(artwork.id);
      if (!result.success) throw new Error(result.error);

      toast.success('Artwork deleted successfully');
      router.push('/studio/archive');
      router.refresh();
    } catch (err: any) {
      toast.error('Failed to delete artwork: ' + err.message);
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="text-center py-20 max-w-md mx-auto">
        <h2 className="text-lg font-semibold text-slate-900">Artwork not found</h2>
        <p className="text-sm text-slate-500 mt-2">The record may have been removed.</p>
        <Link href="/studio/archive">
          <Button className="mt-6 bg-slate-900 text-white">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <Link href="/studio/archive" className="inline-flex items-center text-slate-500 hover:text-slate-900 mb-2 text-xs font-semibold uppercase tracking-wider transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Edit Artwork</h1>
          <p className="text-sm text-slate-500 mt-1">Update profile or manage storage for &quot;{artwork.title}&quot;.</p>
        </div>
        <Button
          variant="destructive"
          type="button"
          onClick={() => setDeleteDialogOpen(true)}
          className="md:self-end flex-shrink-0"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Artwork
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Image Card */}
        <Card className="border border-slate-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Artwork Image</CardTitle>
            <CardDescription>Upload a new image to replace the current one.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Display current image */}
            {artwork.image_url && !newImagePreview && (
              <div className="relative aspect-[4/3] w-full max-w-md mx-auto bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={artwork.image_url}
                  alt={artwork.title}
                  className="object-contain w-full h-full max-h-full"
                />
              </div>
            )}

            {/* Display new preview image */}
            {newImagePreview && (
              <div className="relative aspect-[4/3] w-full max-w-md mx-auto bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={newImagePreview}
                  alt="New Preview"
                  className="object-contain w-full h-full max-h-full"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={removeNewImage}
                  className="absolute top-3 right-3 h-8 w-8 rounded-full shadow-md"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-slate-800 bg-slate-50/50'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">
                {artwork.image_url ? 'Drop image here to replace current image' : 'Drop image here or click to upload'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Supports PNG, JPG, WEBP up to 10MB</p>
            </div>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card className="border border-slate-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Artwork Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inventory_number" className="text-slate-700 font-medium">Work ID</Label>
                <Input
                  id="inventory_number"
                  value={formData.inventory_number}
                  onChange={(e) => setFormData({ ...formData, inventory_number: e.target.value })}
                  className="bg-white border-slate-200 focus:border-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location" className="text-slate-700 font-medium">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="bg-white border-slate-200 focus:border-slate-400"
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-slate-700 font-medium">Title <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="bg-white border-slate-200 focus:border-slate-400"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_120px] gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-slate-700 font-medium">Price</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="bg-white border-slate-200 focus:border-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-slate-700 font-medium">Currency</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                  className="bg-white border-slate-200 focus:border-slate-400"
                  maxLength={3}
                />
              </div>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/60 p-4">
              <div>
                <Label htmlFor="is_price_visible" className="text-slate-700 font-medium">Show price on public site</Label>
                <p className="mt-1 text-xs text-slate-500">Turn this off to keep the price private while retaining it in the dashboard and catalog.</p>
              </div>
              <Switch
                id="is_price_visible"
                checked={formData.is_price_visible}
                onCheckedChange={(checked) => setFormData({ ...formData, is_price_visible: checked })}
              />
            </div>

            {/* Medium & Year */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="medium" className="text-slate-700 font-medium">Medium</Label>
                <Input
                  id="medium"
                  value={formData.medium}
                  onChange={(e) => setFormData({ ...formData, medium: e.target.value })}
                  className="bg-white border-slate-200 focus:border-slate-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year" className="text-slate-700 font-medium">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="bg-white border-slate-200 focus:border-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="series" className="text-slate-700 font-medium">Series</Label>
                <Input
                  id="series"
                  placeholder="e.g. Nocturnes"
                  value={formData.series}
                  onChange={(e) => setFormData({ ...formData, series: e.target.value })}
                  className="bg-white border-slate-200 focus:border-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-slate-700 font-medium">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g. Landscape"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="bg-white border-slate-200 focus:border-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collection" className="text-slate-700 font-medium">Collection</Label>
                <Input
                  id="collection"
                  placeholder="e.g. Artist Collection"
                  value={formData.collection}
                  onChange={(e) => setFormData({ ...formData, collection: e.target.value })}
                  className="bg-white border-slate-200 focus:border-slate-400"
                />
              </div>
            </div>

            {/* Dimensions */}
            <div className="space-y-2">
              <Label htmlFor="dimensions" className="text-slate-700 font-medium">Dimensions</Label>
              <Input
                id="dimensions"
                value={formData.dimensions}
                onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                className="bg-white border-slate-200 focus:border-slate-400"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-slate-700 font-medium">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger className="bg-white border-slate-200 focus:border-slate-400">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  {ARTWORK_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* On Consignment Checkbox */}
            <div className="flex items-center space-x-2 py-2">
              <Checkbox
                id="on_consignment"
                checked={formData.on_consignment}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    on_consignment: !!checked,
                  })
                }
              />
              <Label htmlFor="on_consignment" className="text-slate-700 font-medium cursor-pointer">
                Currently on consignment
              </Label>
            </div>

            {/* Consignment Location - Conditional */}
            {formData.on_consignment && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <Label htmlFor="consignment_location" className="text-slate-700 font-medium">
                  Consignment Location
                </Label>
                <Input
                  id="consignment_location"
                  placeholder="e.g. Central Gallery London"
                  value={formData.consignment_location}
                  onChange={(e) => setFormData({ ...formData, consignment_location: e.target.value })}
                  className="bg-white border-slate-200 focus:border-slate-400"
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="provenance" className="text-slate-700 font-medium">Provenance</Label>
                <Textarea
                  id="provenance"
                  value={formData.provenance}
                  onChange={(e) => setFormData({ ...formData, provenance: e.target.value })}
                  rows={3}
                  className="bg-white border-slate-200 focus:border-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exhibition_history" className="text-slate-700 font-medium">Exhibitions</Label>
                <Textarea
                  id="exhibition_history"
                  value={formData.exhibition_history}
                  onChange={(e) => setFormData({ ...formData, exhibition_history: e.target.value })}
                  rows={3}
                  className="bg-white border-slate-200 focus:border-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publications" className="text-slate-700 font-medium">Publications</Label>
                <Textarea
                  id="publications"
                  value={formData.publications}
                  onChange={(e) => setFormData({ ...formData, publications: e.target.value })}
                  rows={3}
                  className="bg-white border-slate-200 focus:border-slate-400"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-slate-700 font-medium">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="bg-white border-slate-200 focus:border-slate-400"
              />
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <Link href="/studio/archive">
            <Button type="button" variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={saving}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm px-6"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Delete Artwork</DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to permanently delete this artwork? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              type="button"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-slate-200 text-slate-700"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              type="button"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
