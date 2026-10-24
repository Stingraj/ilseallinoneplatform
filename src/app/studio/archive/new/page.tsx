'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { addArtworkAction } from '@/app/actions/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDropzone } from 'react-dropzone';
import { X, Upload, ArrowLeft } from 'lucide-react';
import { ARTWORK_STATUS_OPTIONS } from '@/lib/catalog';
import { compressArtworkImage } from '@/lib/compress-image';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewArtworkPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Single image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const [formData, setFormData] = useState({
    inventory_number: '',
    title: '',
    medium: '',
    dimensions: '',
    year: '',
    price: '',
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      const file = acceptedFiles[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 10485760, // 10MB
  });

  const removeImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please enter an artwork title');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('inventory_number', formData.inventory_number);
      data.append('medium', formData.medium);
      data.append('dimensions', formData.dimensions);
      data.append('year', formData.year);
      data.append('price', formData.price);
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

      if (imageFile) {
        const originalSize = (imageFile.size / 1024).toFixed(0);
        const compressedImage = await compressArtworkImage(imageFile);
        const compressedSize = (compressedImage.size / 1024).toFixed(0);
        toast(`Uploading compressed image: ${originalSize}KB → ${compressedSize}KB`);
        data.append('image', compressedImage);
      }

      const result = await addArtworkAction(data);
      if (!result.success) throw new Error(result.error);

      toast.success('Artwork added successfully');
      router.push('/studio/archive');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add artwork');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div>
          <Link href="/studio/archive" className="inline-flex items-center text-slate-500 hover:text-slate-900 mb-2 text-xs font-semibold uppercase tracking-wider transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Add New Artwork</h1>
          <p className="text-sm text-slate-500 mt-1">Register a new piece in your catalog.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image upload */}
        <Card className="border border-slate-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Artwork Image</CardTitle>
            <CardDescription>Upload the primary photograph of the artwork.</CardDescription>
          </CardHeader>
          <CardContent>
            {!imagePreview ? (
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
                  Drop image here or click to upload
                </p>
                <p className="text-xs text-slate-400 mt-1">Supports PNG, JPG, WEBP up to 10MB</p>
              </div>
            ) : (
              <div className="relative aspect-[4/3] w-full max-w-md mx-auto bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="object-contain w-full h-full max-h-full"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={removeImage}
                  className="absolute top-3 right-3 h-8 w-8 rounded-full shadow-md"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form fields */}
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
                  placeholder="e.g. IM22_"
                  value={formData.inventory_number}
                  onChange={(e) => setFormData({ ...formData, inventory_number: e.target.value })}
                  className="bg-white border-slate-200 focus:border-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location" className="text-slate-700 font-medium">Location</Label>
                <Input
                  id="location"
                  placeholder="Studio, collector, gallery..."
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
                placeholder="e.g. Untitled Landscape"
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
                  placeholder="Private, only shown inside dashboard"
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

            {/* Medium & Year */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="medium" className="text-slate-700 font-medium">Medium</Label>
                <Input
                  id="medium"
                  placeholder="e.g. Oil on canvas"
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
                  placeholder="e.g. 2026"
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
                placeholder="e.g. 120 x 90 x 3 cm"
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
                  placeholder="Ownership history, source, or archive notes..."
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
                  placeholder="One exhibition per line"
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
                  placeholder="Books, catalogs, articles, or citations..."
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
                placeholder="Add general description, history or other private records..."
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
            disabled={loading}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm px-6"
          >
            {loading ? 'Adding...' : 'Add to Catalog'}
          </Button>
        </div>
      </form>
    </div>
  );
}
