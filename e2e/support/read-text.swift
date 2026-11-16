// Prints the text Apple's Vision framework recognizes in an image, one line per text block,
// as "<left> <top> <right>\t<text>" with positions as fractions of the image (top-left origin).
// Usage: read-text <image.png>. The end-to-end tests read Herdr screenshots with it.
import AppKit
import Foundation
import Vision

let path = CommandLine.arguments[1]
guard let img = NSImage(contentsOfFile: path),
      let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
  fputs("cannot read image\n", stderr)
  exit(1)
}
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
req.usesLanguageCorrection = false
try VNImageRequestHandler(cgImage: cg).perform([req])
for o in req.results ?? [] {
  guard let t = o.topCandidates(1).first else { continue }
  let b = o.boundingBox
  print(String(format: "%.4f %.4f %.4f\t%@", b.minX, 1 - b.maxY, b.maxX, t.string))
}
