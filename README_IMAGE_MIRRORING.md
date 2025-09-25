# Image Mirroring Scripts

These scripts download product images from external URLs and store them in your Supabase storage bucket, then update the database to use the local URLs.

## What They Do

1. **Download images** from external URLs (e.g., Adidas, Nike, etc.)
2. **Upload to Supabase storage** in the `product-images` bucket
3. **Update database** to use the local Supabase URLs
4. **Handle errors gracefully** and continue processing

## Scripts

### `mirror_images.js`
- Processes ALL products with image URLs
- Will re-process products that already have Supabase URLs
- Use this for initial setup or to force re-processing

### `mirror_images_smart.js` (Recommended)
- Only processes products that don't already have Supabase URLs
- Skips already mirrored images
- More efficient for ongoing use

## Prerequisites

1. **Supabase storage bucket** will be created automatically
2. **Node.js** with ES modules support
3. **Dependencies**: `@supabase/supabase-js` and `node-fetch`

## Usage

### First Time Setup
```bash
# Install dependencies
npm install node-fetch

# Run the smart version (recommended)
node scripts/mirror_images_smart.js
```

### Force Re-processing All Images
```bash
# Use the regular version to process everything
node scripts/mirror_images.js
```

## How It Works

1. **Bucket Creation**: Creates `product-images` bucket if it doesn't exist
2. **Batch Processing**: Processes products in batches of 500
3. **Image Download**: Downloads images with proper User-Agent headers
4. **Storage Upload**: Uploads to Supabase with organized naming
5. **Database Update**: Updates `main_image_url` field with local URL
6. **Error Handling**: Continues processing even if individual images fail

## File Naming Convention

Images are stored with the pattern:
```
main/{product_id}-{hash}.{extension}
```

Example: `main/27f51cc3-b03c-46e9-82be-9922366f3cb8-a1b2c3d4e5.jpg`

## Benefits

- **Faster loading**: Local storage vs external URLs
- **Reliability**: No dependency on external servers
- **Cost control**: Predictable storage costs
- **Performance**: Better CDN performance through Supabase

## Monitoring

The scripts provide detailed logging:
- ✅ Successfully processed images
- ⚠️ HTTP errors (skipped)
- ❌ Upload/database errors
- ⏭️ Already mirrored images (smart version only)

## Storage Bucket

The `product-images` bucket is created with:
- **Public access** enabled
- **Automatic cleanup** not configured (images persist)
- **Organized structure** in `main/` subfolder

## Troubleshooting

### Common Issues

1. **Rate limiting**: Script includes delays between batches
2. **Network errors**: Individual failures don't stop the process
3. **Storage limits**: Check your Supabase storage quota
4. **Permission errors**: Ensure service role key has storage access

### Manual Bucket Management

To manage the bucket manually in Supabase dashboard:
1. Go to Storage → Buckets
2. Find `product-images` bucket
3. View files, manage policies, etc.

## Performance

- **Batch size**: 500 products per batch
- **Delay**: 1 second between batches
- **Timeout**: 15 seconds per image download
- **Concurrent**: Sequential processing for stability

## Next Steps

After running the script:
1. **Verify images** in Supabase Storage dashboard
2. **Test your app** to ensure images load correctly
3. **Monitor storage usage** in Supabase dashboard
4. **Run periodically** to catch new products 