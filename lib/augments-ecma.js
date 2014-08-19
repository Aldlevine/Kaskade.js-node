module.exports = function() {
    /** OBJECT AUGMENTATION **/
    Object.isEqual = function(a, b) {
        if (Object.keys(a).length == Object.keys(b).length) {
            for (var k in a) {
                if (a[k] !== b[k])
                    return false;
                return true;
            }
        }
        return false;
    };
    /** /OBJECT AUGMENTATION **/

    /** ARRAY AUGMENTATION **/
    Array.prototype.remove = function(element) {
        var index = this.indexOf(element);
        if (index >= 0)
            this.splice(index, 1);
        return index;
    };
    Array.prototype.add = function(element) {
        if (this.indexOf(element) < 0)
            this.push(element);
    };
    Array.prototype.last = function() {
        return this[this.length - 1];
    };
    Array.prototype.clone = function() {
        return this.slice(0);
    };
    Object.defineProperties(Array.prototype, {
        remove : {
            enumerable : false
        },
        add : {
            enumerable : false
        },
        last : {
            enumerable : false
        },
        clone : {
            enumerable : false
        }
    });
    /** /ARRAY AUGMENTATION **/

    /** STRING AUGMENTATION **/
    String.prototype.camelCase = function() {
        var arr = this.split('-');
        for (var i = 1, len = arr.length; i < len; i++) {
            arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1);
        }
        return arr.join('');
    };
    /** /STRING AUGMENTATION **/
}; 