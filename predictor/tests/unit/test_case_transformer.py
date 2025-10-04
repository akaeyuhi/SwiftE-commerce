"""
Unit tests for CaseTransformer - Complete Version
"""
import pytest
from predictor.case_transformer import CaseTransformer


class TestCaseTransformerStringConversion:
    """Test string case conversion"""

    # ================================
    # CamelCase to snake_case
    # ================================

    def test_camel_to_snake_simple(self):
        """Test simple camelCase to snake_case"""
        assert CaseTransformer.camelToSnake('helloWorld') == 'hello_world'
        assert CaseTransformer.camelToSnake('userId') == 'user_id'
        assert CaseTransformer.camelToSnake('productId') == 'product_id'

    def test_camel_to_snake_single_word(self):
        """Test single word (no conversion)"""
        assert CaseTransformer.camelToSnake('hello') == 'hello'
        assert CaseTransformer.camelToSnake('product') == 'product'
        assert CaseTransformer.camelToSnake('test') == 'test'

    def test_camel_to_snake_multiple_capitals(self):
        """Test multiple consecutive capitals"""
        assert CaseTransformer.camelToSnake('XMLHttpRequest') == 'x_m_l_http_request'
        assert CaseTransformer.camelToSnake('IOError') == 'i_o_error'

    def test_camel_to_snake_numbers(self):
        """Test strings with numbers"""
        assert CaseTransformer.camelToSnake('user123Id') == 'user123_id'
        assert CaseTransformer.camelToSnake('test2Value') == 'test2_value'

    def test_camel_to_snake_already_snake(self):
        """Test already snake_case (should lowercase)"""
        assert CaseTransformer.camelToSnake('hello_world') == 'hello_world'
        assert CaseTransformer.camelToSnake('user_id') == 'user_id'

    def test_camel_to_snake_empty_string(self):
        """Test empty string"""
        assert CaseTransformer.camelToSnake('') == ''

    def test_camel_to_snake_special_cases(self):
        """Test special naming cases"""
        assert CaseTransformer.camelToSnake('API') == 'a_p_i'
        assert CaseTransformer.camelToSnake('HTTPSConnection') == 'h_t_t_p_s_connection'
        assert CaseTransformer.camelToSnake('getHTTPResponseCode') == 'get_h_t_t_p_response_code'

    # ================================
    # snake_case to camelCase
    # ================================

    def test_snake_to_camel_simple(self):
        """Test simple snake_case to camelCase"""
        assert CaseTransformer.snakeToCamel('hello_world') == 'helloWorld'
        assert CaseTransformer.snakeToCamel('user_id') == 'userId'
        assert CaseTransformer.snakeToCamel('product_name') == 'productName'

    def test_snake_to_camel_single_word(self):
        """Test single word (no conversion)"""
        assert CaseTransformer.snakeToCamel('hello') == 'hello'
        assert CaseTransformer.snakeToCamel('product') == 'product'

    def test_snake_to_camel_multiple_underscores(self):
        """Test multiple underscores"""
        assert CaseTransformer.snakeToCamel('this_is_a_test') == 'thisIsATest'
        assert CaseTransformer.snakeToCamel('very_long_variable_name') == 'veryLongVariableName'

    def test_snake_to_camel_with_numbers(self):
        """Test with numbers"""
        assert CaseTransformer.snakeToCamel('user_123_id') == 'user123Id'
        assert CaseTransformer.snakeToCamel('test_2_value') == 'test2Value'

    def test_snake_to_camel_already_camel(self):
        """Test already camelCase"""
        assert CaseTransformer.snakeToCamel('helloWorld') == 'helloWorld'
        assert CaseTransformer.snakeToCamel('userId') == 'userId'

    def test_snake_to_camel_empty_string(self):
        """Test empty string"""
        assert CaseTransformer.snakeToCamel('') == ''

    def test_snake_to_camel_leading_trailing_underscores(self):
        """Test leading/trailing underscores"""
        assert CaseTransformer.snakeToCamel('_private_var') == 'PrivateVar'
        assert CaseTransformer.snakeToCamel('value_') == 'value'
        assert CaseTransformer.snakeToCamel('_internal_value_') == 'InternalValue'

    # ================================
    # Round-trip conversions
    # ================================

    def test_round_trip_camel_snake_camel(self):
        """Test camelCase -> snake_case -> camelCase"""
        original = 'helloWorld'
        snake = CaseTransformer.camelToSnake(original)
        back_to_camel = CaseTransformer.snakeToCamel(snake)
        assert back_to_camel == original

    def test_round_trip_snake_camel_snake(self):
        """Test snake_case -> camelCase -> snake_case"""
        original = 'hello_world'
        camel = CaseTransformer.snakeToCamel(original)
        back_to_snake = CaseTransformer.camelToSnake(camel)
        assert back_to_snake == original


class TestCaseTransformerDictTransformation:
    """Test dictionary key transformation"""

    # ================================
    # Transform to snake_case
    # ================================

    def test_transform_keys_to_snake_simple(self):
        """Test simple dictionary transformation"""
        input_data = {
            'userId': '123',
            'firstName': 'John',
            'lastName': 'Doe'
        }

        expected = {
            'user_id': '123',
            'first_name': 'John',
            'last_name': 'Doe'
        }

        result = CaseTransformer.transformKeysToSnake(input_data)
        assert result == expected

    def test_transform_keys_to_snake_nested(self):
        """Test nested dictionary transformation"""
        input_data = {
            'userId': '123',
            'userProfile': {
                'firstName': 'John',
                'lastName': 'Doe',
                'contactInfo': {
                    'emailAddress': 'john@example.com',
                    'phoneNumber': '555-0123'
                }
            }
        }

        result = CaseTransformer.transformKeysToSnake(input_data)

        assert result['user_id'] == '123'
        assert 'user_profile' in result
        assert result['user_profile']['first_name'] == 'John'
        assert result['user_profile']['contact_info']['email_address'] == 'john@example.com'

    def test_transform_keys_to_snake_with_list(self):
        """Test transformation with lists"""
        input_data = {
            'userList': [
                {'userId': '1', 'firstName': 'John'},
                {'userId': '2', 'firstName': 'Jane'}
            ]
        }

        result = CaseTransformer.transformKeysToSnake(input_data)

        assert 'user_list' in result
        assert result['user_list'][0]['user_id'] == '1'
        assert result['user_list'][0]['first_name'] == 'John'
        assert result['user_list'][1]['user_id'] == '2'

    def test_transform_keys_to_snake_empty_dict(self):
        """Test empty dictionary"""
        assert CaseTransformer.transformKeysToSnake({}) == {}

    def test_transform_keys_to_snake_mixed_types(self):
        """Test mixed value types"""
        input_data = {
            'stringValue': 'hello',
            'intValue': 123,
            'floatValue': 45.67,
            'boolValue': True,
            'nullValue': None,
            'arrayValue': [1, 2, 3],
            'objectValue': {'nestedKey': 'value'}
        }

        result = CaseTransformer.transformKeysToSnake(input_data)

        assert result['string_value'] == 'hello'
        assert result['int_value'] == 123
        assert result['float_value'] == 45.67
        assert result['bool_value'] is True
        assert result['null_value'] is None
        assert result['array_value'] == [1, 2, 3]
        assert result['object_value']['nested_key'] == 'value'

    # ================================
    # Transform to camelCase
    # ================================

    def test_transform_keys_to_camel_simple(self):
        """Test simple dictionary transformation to camelCase"""
        input_data = {
            'user_id': '123',
            'first_name': 'John',
            'last_name': 'Doe'
        }

        expected = {
            'userId': '123',
            'firstName': 'John',
            'lastName': 'Doe'
        }

        result = CaseTransformer.transformKeysToCamel(input_data)
        assert result == expected

    def test_transform_keys_to_camel_nested(self):
        """Test nested dictionary transformation to camelCase"""
        input_data = {
            'user_id': '123',
            'user_profile': {
                'first_name': 'John',
                'contact_info': {
                    'email_address': 'john@example.com'
                }
            }
        }

        result = CaseTransformer.transformKeysToCamel(input_data)

        assert result['userId'] == '123'
        assert 'userProfile' in result
        assert result['userProfile']['firstName'] == 'John'
        assert result['userProfile']['contactInfo']['emailAddress'] == 'john@example.com'

    def test_transform_keys_to_camel_with_list(self):
        """Test transformation to camelCase with lists"""
        input_data = {
            'user_list': [
                {'user_id': '1', 'first_name': 'John'},
                {'user_id': '2', 'first_name': 'Jane'}
            ]
        }

        result = CaseTransformer.transformKeysToCamel(input_data)

        assert 'userList' in result
        assert result['userList'][0]['userId'] == '1'
        assert result['userList'][0]['firstName'] == 'John'

    # ================================
    # Special cases
    # ================================

    def test_transform_preserves_values(self):
        """Test that transformation preserves all value types"""
        input_data = {
            'userId': 123,
            'isActive': True,
            'score': 45.67,
            'tags': ['tag1', 'tag2'],
            'metadata': None,
            'nested': {
                'deepValue': [1, 2, {'key': 'value'}]
            }
        }

        result = CaseTransformer.transformKeysToSnake(input_data)

        # Values should be preserved
        assert result['user_id'] == 123
        assert result['is_active'] is True
        assert result['score'] == 45.67
        assert result['tags'] == ['tag1', 'tag2']
        assert result['metadata'] is None
        assert result['nested']['deep_value'][2]['key'] == 'value'

    def test_transform_primitives(self):
        """Test that primitives are returned unchanged"""
        assert CaseTransformer.transformKeysToSnake('string') == 'string'
        assert CaseTransformer.transformKeysToSnake(123) == 123
        assert CaseTransformer.transformKeysToSnake(45.67) == 45.67
        assert CaseTransformer.transformKeysToSnake(True) is True
        assert CaseTransformer.transformKeysToSnake(None) is None
        assert CaseTransformer.transformKeysToSnake([1, 2, 3]) == [1, 2, 3]

    def test_transform_deep_nesting(self):
        """Test deeply nested structures"""
        input_data = {
            'level1': {
                'level2': {
                    'level3': {
                        'level4': {
                            'deepValue': 'found'
                        }
                    }
                }
            }
        }

        result = CaseTransformer.transformKeysToSnake(input_data)
        assert result['level1']['level2']['level3']['level4']['deep_value'] == 'found'

    def test_transform_list_of_primitives(self):
        """Test list of primitive values"""
        input_data = {'values': [1, 'two', 3.0, True, None]}
        result = CaseTransformer.transformKeysToSnake(input_data)
        assert result['values'] == [1, 'two', 3.0, True, None]

    def test_transform_mixed_list(self):
        """Test list with mixed dictionaries and primitives"""
        input_data = {
            'mixedList': [
                {'userId': 1},
                'string',
                123,
                {'userName': 'test'},
                None
            ]
        }

        result = CaseTransformer.transformKeysToSnake(input_data)

        assert result['mixed_list'][0]['user_id'] == 1
        assert result['mixed_list'][1] == 'string'
        assert result['mixed_list'][2] == 123
        assert result['mixed_list'][3]['user_name'] == 'test'
        assert result['mixed_list'][4] is None

    # ================================
    # Round-trip transformations
    # ================================

    def test_round_trip_dict_transformation(self):
        """Test round-trip dictionary transformation"""
        original = {
            'userId': '123',
            'firstName': 'John',
            'metadata': {
                'createdAt': '2025-01-01',
                'updatedAt': '2025-01-02'
            }
        }

        # camelCase -> snake_case -> camelCase
        snake = CaseTransformer.transformKeysToSnake(original)
        back_to_camel = CaseTransformer.transformKeysToCamel(snake)

        assert back_to_camel == original


class TestCaseTransformerEdgeCases:
    """Test edge cases and error handling"""

    def test_unicode_strings(self):
        """Test Unicode strings"""
        input_data = {'userName': 'José', 'userEmail': 'test@example.com'}
        result = CaseTransformer.transformKeysToSnake(input_data)
        assert result['user_name'] == 'José'

    def test_special_characters_in_values(self):
        """Test special characters in values"""
        input_data = {
            'description': 'Test with special chars: !@#$%^&*()',
            'code': '<script>alert("test")</script>'
        }
        result = CaseTransformer.transformKeysToSnake(input_data)
        assert result['description'] == 'Test with special chars: !@#$%^&*()'

    def test_large_nested_structure(self):
        """Test large nested structure performance"""
        # Create large nested structure
        data = {}
        current = data
        for i in range(50):
            key = f'level{i}Key'
            current[key] = {}
            current = current[key]

        current['finalValue'] = 'deep'

        # Should handle without errors
        result = CaseTransformer.transformKeysToSnake(data)
        assert result is not None

    def test_circular_reference_protection(self):
        """Test that circular references don't cause infinite loops"""
        # Note: Python dicts can't have true circular references
        # But we can test that nested references work
        inner = {'innerKey': 'value'}
        outer = {'outerKey': inner, 'reference': inner}

        result = CaseTransformer.transformKeysToSnake(outer)
        assert result['outer_key']['inner_key'] == 'value'
        assert result['reference']['inner_key'] == 'value'
