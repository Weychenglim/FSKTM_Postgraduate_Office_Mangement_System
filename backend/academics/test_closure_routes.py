from django.test import SimpleTestCase
from django.urls import resolve, Resolver404

class ClosurePreviewRouteTests(SimpleTestCase):
    def test_semester_closure_preview_route_exists(self):
        try:
            match = resolve('/api/academics/semesters/1/closure-preview/')
        except Resolver404:
            self.fail('Semester closure preview endpoint is missing')
        self.assertEqual(match.kwargs, {'pk': 1})
