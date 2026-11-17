// Prints the text Apple's Vision framework recognizes in an image, one line per text block,
// as "<left> <top> <right>\t<text>" with positions as fractions of the image (top-left origin).
// Usage: read-text <image.png> [column]. With column (a fraction from 0 to 1), only the image's
// left part of that width is read, scaled up twice so small, faint sidebar text is recognized;
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
let scale = column < 1 ? 2 : 1
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
try VNImageRequestHandler(cgImage: cg).perform([req])
for o in req.results ?? [] {
  guard let t = o.topCandidates(1).first else { continue }
  let b = o.boundingBox
  print(String(format: "%.4f %.4f %.4f\t%@", b.minX * column, 1 - b.maxY, b.maxX * column, t.string))
}
