(function () {

	window._paddingsTest = function () {
		var test = function (padding) {
			for (var len = 0; len <= 32; len++) {
				var initialArray = random.default.getUint8Array(len);
				var padded = padding.pad(initialArray, 16, random.default);
				var padCount = padding.unpad(padded);
				if (padCount == -1) {
					console.log('Failed! 1');
					return;
				}

				var unpadded = padded.subarray(0, padded.length - padCount);
				if (initialArray.length != unpadded.length) {
					console.log('Failed! 2');
					return;
				}
				for (var i = 0; i < len; i++)
					if (initialArray[i] != unpadded[i]) {
						console.log('Failed! 3');
						return;
					}
			}
			console.log('passed');
		};

		console.log('ANSI X.923 test');
		test(paddings['ANSI X.923']);

		console.log('ISO 10126 test');
		test(paddings['ISO 10126']);

		console.log('PKCS7 test');
		test(paddings['PKCS7']);

		console.log('ISO/IEC 7816-4 test');
		test(paddings['ISO/IEC 7816-4']);
	};

	var a40 = [25, 215, 226, 12, 106, 44, 159, 200, 49, 56, 86, 185, 11, 129, 90, 44, 125, 56, 126, 161, 114, 118, 212, 181, 23, 207, 189, 3, 55, 60, 7, 51, 5, 40, 199, 63, 151, 19, 88, 63];

	window._md2Test = function () {
		var test = function (bytes, hex) {
			return bh.byteArrayToHex(hashAlgorithms.md2.computeHash(bytes)) == hex;
		};

		var result = true;
		result &= test([], '8350e5a3e24c153df2275c9f80692773');
		result &= test([255], '0797438d0baf3d71b7194ab3c71746b6');
		result &= test(a40, '92183ec96932db4a26396b23d4df87a3');

		console.log(result ? 'Passed' : 'Failed');
	};

	window._md4Test = function () {
		var test = function (bytes, hex) {
			return bh.byteArrayToHex(hashAlgorithms.md4.computeHash(bytes)) == hex;
		};

		var result = true;
		result &= test([], '31d6cfe0d16ae931b73c59d7e0c089c0');
		result &= test([255], '82c167af8e345bd055487af8d2b540c9');
		result &= test(a40, 'c146aadc86111c7de36c7f319fa8a15d');

		console.log(result ? 'Passed' : 'Failed');
	};

	window._md5Test = function () {
		var test = function (bytes, hex) {
			return bh.byteArrayToHex(hashAlgorithms.md5.computeHash(bytes)) == hex;
		};

		var result = true;
		result &= test([], 'd41d8cd98f00b204e9800998ecf8427e');
		result &= test([255], '00594fd4f42ba43fc1ca0427a0576295');
		result &= test(a40, '332f73d56f380cea8ab0d51e855bac41');

		console.log(result ? 'Passed' : 'Failed');
	}

	window._sha1Test = function () {
		var test = function (bytes, hex) {
			return bh.byteArrayToHex(hashAlgorithms.sha1.computeHash(bytes)) == hex;
		};

		var result = true;
		result &= test([], 'da39a3ee5e6b4b0d3255bfef95601890afd80709');
		result &= test([255], '85e53271e14006f0265921d02d4d736cdc580b0b');
		result &= test(a40, '7a4ce8e483c6fb3460501e660fb164a4d2928c57');

		console.log(result ? 'Passed' : 'Failed');
	};

	window._sha2Test = function () {
		var test = function (bytes, ver, hex) {
			if (ver == 224)
				return bh.byteArrayToHex(hashAlgorithms.sha224.computeHash(bytes)) == hex;
			if (ver == 256)
				return bh.byteArrayToHex(hashAlgorithms.sha256.computeHash(bytes)) == hex;
			if (ver == 384)
				return bh.byteArrayToHex(hashAlgorithms.sha384.computeHash(bytes)) == hex;
			if (ver == 512)
				return bh.byteArrayToHex(hashAlgorithms.sha512.computeHash(bytes)) == hex;
		};

		console.log('SHA-224');
		var result = true;
		result &= test([], 224, 'd14a028c2a3a2bc9476102bb288234c415a2b01f828ea62ac5b3e42f');
		result &= test([255], 224, 'e33f9d75e6ae1369dbabf81b96b4591ae46bba30b591a6b6c62542b5');
		result &= test(a40, 224, '4beabeb77adf912c2270c455dd215f818662c0d61b85508c7def6a73');
		console.log(result ? 'Passed' : 'Failed');

		console.log('SHA-256');
		var result = true;
		result &= test([], 256, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
		result &= test([255], 256, 'a8100ae6aa1940d0b663bb31cd466142ebbdbd5187131b92d93818987832eb89');
		result &= test(a40, 256, '9792f39846b22bee11dbaa2a34014141c90cb4ef2f2c16dc83a48b0456f4705d');
		console.log(result ? 'Passed' : 'Failed');

		console.log('SHA-384');
		var result = true;
		result &= test([], 384, '38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b');
		result &= test([255], 384, '43950796d9883503655e35b5190aee687a2dd99f265012625b95753978e4efff3e8414d178a6e2318480d8eb6ddee643');
		result &= test(a40, 384, '1fde9ca46c6d627edfbda629ce47e9101e803674e9156f9706d7a9406e5fe1c91e981e4276b37c78ce8c329b4a30a765');
		console.log(result ? 'Passed' : 'Failed');

		console.log('SHA-512');
		var result = true;
		result &= test([], 512, 'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e');
		result &= test([255], 512, '6700df6600b118ab0432715a7e8a68b0bf37cdf4adaf0fb9e2b3ebe04ad19c7032cbad55e932792af360bafaa09962e2e690652bc075b2dad0c30688ba2f31a3');
		result &= test([97, 98, 99], 512, 'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f');
		test(a40, 512, 'a8e64de4f5fa72e7a1a1bee705d87acc50748a810482a088535e53ad741ed68fb0c7cb08035802f63d466ba629b13823705db763f5ec043918f20c2266c0a783');
		console.log(result ? 'Passed' : 'Failed');
	};

	window._ripemd160Test = function () {
		var test = function (bytes, hex) {
			return bh.byteArrayToHex(hashAlgorithms.ripemd160.computeHash(bytes)) == hex;
		};

		var result = true;
		result &= test([], '9c1185a5c5e9fc54612808977ee8f548b2258d31');
		result &= test([255], '2c0c45d3ecab80fe060e5f1d7057cd2f8de5e557');
		result &= test(a40, '7b78ec9d05702f000dbb1d88c2c941795b4f62bd');

		console.log(result ? 'Passed' : 'Failed');
	};

	window._hashAlgoTest = function () {
		console.log('md2'); _md2Test();
		console.log('md4'); _md4Test();
		console.log('md5'); _md5Test();
		console.log('sha1'); _sha1Test();
		_sha2Test();
		console.log('ripemd160'); _ripemd160Test();
	};
})();