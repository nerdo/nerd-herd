// Prints the text Apple's Vision framework recognizes in an image, one line per text block.
// Usage: read-text <image.png>. The end-to-end tests read Herdr screenshots with it.
import Foundation
import Vision
import AppKit
let path = CommandLine.arguments[1]
guard let img = NSImage(contentsOfFile: path), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { fputs("cannot read image\n", stderr); exit(1) }
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
req.usesLanguageCorrection = false
try VNImageRequestHandler(cgImage: cg).perform([req])
for o in req.results ?? [] { if let t = o.topCandidates(1).first { print(t.string) } }
