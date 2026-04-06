# Mav NodeJS SDK

This is the NodeJS SDK for [Mav](https://mav.com).

You can start by installing the package:

```bash
npm install @mav/node
```

## Usage
```typescript
import Mav from '@mav/node';
const mav = new Mav('your api key', 'your self-hosted instance (optional)');
```

The available methods are:
- `post(posts: CreatePostDto)` - Schedule a post to Mav
- `postList(filters: GetPostsDto)` - Get a list of posts
- `upload(file: Buffer, extension: string)` - Upload a file to Mav
- `integrations()` - Get a list of connected channels
- `deletePost(id: string)` - Delete a post by ID

Alternatively you can use the SDK with curl, check the [Mav API documentation](https://docs.mav.com/public-api) for more information.