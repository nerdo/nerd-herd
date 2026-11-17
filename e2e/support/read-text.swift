// Prints the text Apple's Vision framework recognizes in an image, one line per text block,
// as "<left> <top> <right>\t<text>" with positions as fractions of the image (top-left origin).
// Usage: read-text <image.png> [column]. With column (a fraction from 0 to 1), only the image's
// left part of that width is read, scaled up twice so small, faint sidebar text is recognized.
// Without it, an image wider than 1100 pixels is read in overlapping tiles (see below);
// positions are still fractions of the whole image. The image is read in gray with its contrast raised,
// so dim text on a light banner is recognized as a person sees it. The end-to-end tests read Herdr
// screenshots with it.
import AppKit
import CoreImage
import Foundation
import Vision

let path = CommandLine.arguments[1]
let column = CommandLine.arguments.count > 2 ? Double(CommandLine.arguments[2]) ?? 1 : 1
guard let img = NSImage(contentsOfFile: path),
      let full = img.cgImage(forProposedRect: nil, context: nil, hints: nil),
      let part = full.cropping(to: CGRect(x: 0, y: 0, width: Int(Double(full.width) * column), height: full.height)) else {
  fputs("cannot read image\n", stderr)
  exit(1)
}
/// Recognizes the text in one part of the image; positions come back as fractions of the whole image.
func recognize(_ part: CGImage, offsetX: Int, scale: Int) -> [(Double, Double, Double, String)] {
  guard let ctx = CGContext(data: nil, width: part.width * scale, height: part.height * scale, bitsPerComponent: 8,
                            bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(),
                            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else {
    fputs("cannot scale image\n", stderr)
    exit(1)
  }
  ctx.interpolationQuality = .high
  ctx.draw(part, in: CGRect(x: 0, y: 0, width: part.width * scale, height: part.height * scale))
  guard let scaled = ctx.makeImage() else { fputs("cannot scale image\n", stderr); exit(1) }
  let contrast = Double(ProcessInfo.processInfo.environment["READ_TEXT_CONTRAST"] ?? "") ?? 2.5
  let filter = CIFilter(name: "CIColorControls")!
  filter.setValue(CIImage(cgImage: scaled), forKey: kCIInputImageKey)
  filter.setValue(0, forKey: kCIInputSaturationKey)
  filter.setValue(contrast, forKey: kCIInputContrastKey)
  guard let out = filter.outputImage,
        let cg = CIContext().createCGImage(out, from: out.extent) else {
    fputs("cannot raise contrast\n", stderr)
    exit(1)
  }
  let req = VNRecognizeTextRequest()
  req.recognitionLevel = .accurate
  req.usesLanguageCorrection = false
  try? VNImageRequestHandler(cgImage: cg).perform([req])
  let w = Double(full.width), pw = Double(part.width), ox = Double(offsetX)
  return (req.results ?? []).compactMap { o in
    guard let t = o.topCandidates(1).first else { return nil }
    let b = o.boundingBox
    return ((ox + b.minX * pw) / w, 1 - b.maxY, (ox + b.maxX * pw) / w, t.string)
  }
}

// Vision fits the whole picture to its own working size, so in a wide window small text becomes too
// few pixels and is misread (2026-11-17: a 2146-pixel capture read "Icon (an emoji)" as "e0n 1an 6m0m";
// the same capture cut to 1000 pixels read it). A wide whole-window read is therefore made in tiles
// at most `tile` pixels wide, each overlapping the next by `overlap`, so a line up to `overlap`
// pixels wide lies whole in one tile. A block read twice where tiles overlap is printed once.
let tile = 1100, overlap = 500
var blocks: [(Double, Double, Double, String)] = []
if column < 1 || part.width <= tile {
  blocks = recognize(part, offsetX: 0, scale: column < 1 ? 2 : 1)
} else {
  var x = 0
  while true {
    let left = min(x, part.width - tile)
    guard let piece = part.cropping(to: CGRect(x: left, y: 0, width: tile, height: part.height)) else { break }
    for b in recognize(piece, offsetX: left, scale: 1) {
      let seen = blocks.contains { $0.3 == b.3 && abs($0.0 - b.0) < 0.005 && abs($0.1 - b.1) < 0.005 }
      if !seen { blocks.append(b) }
    }
    if left + tile >= part.width { break }
    x += tile - overlap
  }
}
for b in blocks {
  print(String(format: "%.4f %.4f %.4f\t%@", b.0, b.1, b.2, b.3))
}
