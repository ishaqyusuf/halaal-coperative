Pod::Spec.new do |s|
  s.name           = 'ReceiptShare'
  s.version        = '1.0.0'
  s.summary        = 'Imports one shared payment receipt'
  s.homepage       = 'https://halaalvest.com'
  s.license        = { :type => 'UNLICENSED' }
  s.author         = 'HalaalVest'
  s.platform       = :ios, '15.1'
  s.source         = { :path => '.' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files   = '*.swift'
end
