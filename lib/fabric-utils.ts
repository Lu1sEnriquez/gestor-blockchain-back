
import { fabric } from 'fabric';

/**
 * Creates a fabric.Image object from a given URL.
 * This function encapsulates the logic for creating a fabric.Image,
 * handling potential issues with module loading and instantiation.
 *
 * @param url The URL of the image.
 * @returns A Promise that resolves with a fabric.Image instance.
 */
export async function createFabricImageFromUrl(url: string): Promise<fabric.Image> {
  return new Promise<fabric.Image>((resolve, reject) => {
    fabric.Image.fromURL(url, (img) => {
      if (img) {
        resolve(img);
      } else {
        reject(new Error('Failed to create fabric image from URL.'));
      }
    }, { crossOrigin: 'anonymous' });
  });
}
