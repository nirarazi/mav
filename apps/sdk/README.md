# Maverick NodeJS SDK

This is the NodeJS SDK for [Maverick](https://maverick.com).

You can start by installing the package:

```bash
npm install @maverick/node
```

## Usage
```typescript
import Maverick from '@maverick/node';
const maverick = new Maverick('your api key', 'your self-hosted instance (optional)');
```

The available methods are:
- `post(posts: CreatePostDto)` - Schedule a post to Maverick
- `postList(filters: GetPostsDto)` - Get a list of posts
- `upload(file: Buffer, extension: string)` - Upload a file to Maverick
- `integrations()` - Get a list of connected channels
- `deletePost(id: string)` - Delete a post by ID

Alternatively you can use the SDK with curl, check the [Maverick API documentation](https://docs.maverick.com/public-api) for more information.